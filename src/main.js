/**
 * Функция для расчета выручки
 * @param purchase запись о покупке
 * @param _product карточка товара
 * @returns {number}
 */
function calculateSimpleRevenue(purchase, _product) {
    // Расчет выручки от операции
    const { discount, sale_price, quantity } = purchase;
    const resultDiscount = 1 - (discount / 100);

    return sale_price * quantity * resultDiscount;
}

/**
 * Функция для расчета бонусов
 * @param index порядковый номер в отсортированном массиве
 * @param total общее число продавцов
 * @param seller карточка продавца
 * @returns {number}
 */
function calculateBonusByProfit(index, total, seller) {
    // Расчет бонуса от позиции в рейтинге
    if (index === 0) {
        return seller.profit * 15 / 100;
    }
    if (1 <= index && index <= 2) {
        return seller.profit * 10 / 100;
    }
    if (index === total - 1) {
        return 0;
    }
    return seller.profit * 5 / 100;
}

/**
 * Функция для анализа данных продаж
 * @param data
 * @param options
 * @returns {{revenue, top_products, bonus, name, sales_count, profit, seller_id}[]}
 */
function analyzeSalesData(data, options) {
    // Проверка входных данных
    if (!data
        || !Array.isArray(data.sellers)
        || !Array.isArray(data.products)
        || !Array.isArray(data.customers)
        || data.sellers.length === 0
        || data.products.length === 0
        || data.customers.length === 0
    ) {
        throw new Error('Некорректные входные данные');
    }

    // Проверка наличия опций
    const { calculateRevenue, calculateBonus } = options;
    if (!calculateRevenue || !calculateBonus
        || typeof calculateRevenue !== "function"
        || typeof calculateBonus !== "function"
    ) {
        throw new Error('Чего-то не хватает');
    }

    // Подготовка промежуточных данных для сбора статистики
    const sellerStats = data.sellers.map(seller => {
        return {
            id: seller.id,
            name: `${seller.first_name} ${seller.last_name}`,
            revenue: 0,
            profit: 0,
            sales_count: 0,
            products_sold: {}
        };
    })

    // Индексация продавцов и товаров для быстрого доступа
    const sellerIndex = Object.fromEntries(sellerStats.map(seller => [seller.id, seller]));
    const productIndex = Object.fromEntries(data.products.map(product => [product.sku, product]));

    // Расчет выручки и прибыли для каждого продавца
    data.purchase_records.forEach(purchase => {
        const seller = sellerIndex[purchase.seller_id];
        seller.sales_count++;
        seller.revenue += purchase.total_amount;

        purchase.items.forEach(item => {
            const product = productIndex[item.sku];

            const cost = product.purchase_price * item.quantity;
            const revenue = calculateRevenue(item, product);
            const profit = revenue - cost;
            seller.profit += profit;


            if (!seller.products_sold[item.sku]) {
                seller.products_sold[item.sku] = 0;
            }
            seller.products_sold[item.sku]++;
        });
    })

    // Сортировка продавцов по прибыли
    sellerStats.sort((a, b) => {
        if (a.profit < b.profit) {
            return -1;
        }
        if (a.profit > b.profit) {
            return 1
        }
        return 0;
    }).reverse();

    // Назначение премий на основе ранжирования
    sellerStats.forEach((seller, index) => {
        seller.bonus = calculateBonus(index, sellerStats.length, seller);
        seller.top_products = Object.entries(seller.products_sold)
            .map(product => {
                return {
                    sku: product[0],
                    quantity: product[1]
                };
            })
            .toSorted((a, b) => {
                if (a.quantity < b.quantity) {
                    return -1;
                }
                if (a.quantity > b.quantity) {
                    return 1;
                }
                return 0;
            })
            .reverse()
            .slice(0, 10);
    });

    // @TODO: Подготовка итоговой коллекции с нужными полями
    return sellerStats.map(seller => ({
        seller_id: seller.id,
        name: seller.name,
        revenue: +seller.revenue.toFixed(2),
        profit: +seller.profit.toFixed(2),
        sales_count: seller.sales_count,
        top_products: seller.top_products,
        bonus: +seller.bonus.toFixed(2)
    }));
}

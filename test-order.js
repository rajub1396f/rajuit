require('dotenv').config();
const { neon } = require('@neondatabase/serverless');
const sql = neon(process.env.NEON_DB);

(async () => {
  try {
    console.log('Creating test order...');
    
    // Get first user
    const users = await sql`SELECT id FROM users LIMIT 1`;
    if (users.length === 0) {
      console.log('❌ No users found. Please register a user first.');
      return;
    }
    
    const userId = users[0].id;
    console.log(`Using user ID: ${userId}`);
    
    // Create test order
    const orderResult = await sql`
      INSERT INTO orders (user_id, total_amount, status, shipping_address)
      VALUES (${userId}, 299.98, 'processing', '123 Main Street, Riyadh, Saudi Arabia')
      RETURNING id
    `;
    
    const orderId = orderResult[0].id;
    console.log(`✅ Order created with ID: ${orderId}`);
    
    // Add order items
    await sql`
      INSERT INTO order_items (order_id, product_name, product_image, quantity, price)
      VALUES 
        (${orderId}, 'Premium Cotton T-Shirt', '/assets/img/products/aaa111.jpg', 2, 79.99),
        (${orderId}, 'Casual Denim Jeans', '/assets/img/products/aaa777.jpg', 1, 139.99)
    `;
    
    console.log('✅ Order items added successfully!');
    console.log('\nTest order created:');
    console.log('- Order ID:', orderId);
    console.log('- Total: SAR 299.98');
    console.log('- Status: processing');
    console.log('- Items: 2');
    
    // Create second order (delivered)
    const order2Result = await sql`
      INSERT INTO orders (user_id, total_amount, status, shipping_address)
      VALUES (${userId}, 599.99, 'delivered', '456 Shopping District, Jeddah, Saudi Arabia')
      RETURNING id
    `;
    
    const order2Id = order2Result[0].id;
    await sql`
      INSERT INTO order_items (order_id, product_name, product_image, quantity, price)
      VALUES (${order2Id}, 'Designer Abaya', '/assets/img/products/aaa777.jpg', 1, 599.99)
    `;
    
    console.log('\n✅ Second order created (ID:', order2Id, ')');
    
    // Create third order (pending)
    const order3Result = await sql`
      INSERT INTO orders (user_id, total_amount, status, shipping_address)
      VALUES (${userId}, 149.99, 'pending', '789 Al Madinah Road, Mecca, Saudi Arabia')
      RETURNING id
    `;
    
    const order3Id = order3Result[0].id;
    await sql`
      INSERT INTO order_items (order_id, product_name, product_image, quantity, price)
      VALUES (${order3Id}, 'Sports Jacket', '/assets/img/products/aaa111.jpg', 1, 149.99)
    `;
    
    console.log('✅ Third order created (ID:', order3Id, ')');
    console.log('\n🎉 All test orders created successfully!');
    
  } catch (err) {
    console.error('❌ Error:', err.message);
    console.error('Full error:', err);
  }
})();

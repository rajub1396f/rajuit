import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../config/constants.dart';
import '../../models/product_model.dart';
import '../../providers/cart_provider.dart';
import '../../models/order_model.dart';

class ProductDetailScreen extends StatefulWidget {
  final ProductModel product;

  const ProductDetailScreen({
    Key? key,
    required this.product,
  }) : super(key: key);

  @override
  State<ProductDetailScreen> createState() => _ProductDetailScreenState();
}

class _ProductDetailScreenState extends State<ProductDetailScreen> {
  int _quantity = 1;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Product Details'),
        elevation: 0,
      ),
      body: SingleChildScrollView(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Product Image
            Container(
              width: double.infinity,
              height: 300,
              color: Colors.grey[200],
              child: widget.product.image != null
                  ? Image.network(
                      widget.product.image!,
                      fit: BoxFit.cover,
                    )
                  : const Icon(Icons.shopping_bag, size: 100),
            ),
            // Product Details
            Padding(
              padding: const EdgeInsets.all(Constants.defaultPadding),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Name
                  Text(
                    widget.product.name,
                    style: const TextStyle(
                      fontSize: 24,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  const SizedBox(height: 8),

                  // Rating
                  Row(
                    children: [
                      ...List.generate(5, (index) {
                        return Icon(
                          index < widget.product.rating.toInt()
                              ? Icons.star
                              : Icons.star_outline,
                          color: Colors.amber,
                          size: 16,
                        );
                      }),
                      const SizedBox(width: 8),
                      Text(
                        '${widget.product.rating} (${widget.product.reviews} reviews)',
                        style: TextStyle(
                          color: Colors.grey[600],
                          fontSize: 12,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 16),

                  // Price
                  Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 12,
                      vertical: 8,
                    ),
                    decoration: BoxDecoration(
                      color: const Color(0xFFFFC800),
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: Text(
                      '৳${widget.product.price.toStringAsFixed(2)}',
                      style: const TextStyle(
                        fontSize: 24,
                        fontWeight: FontWeight.bold,
                        color: Colors.black,
                      ),
                    ),
                  ),
                  const SizedBox(height: 16),

                  // Description
                  Text(
                    'Description',
                    style: Theme.of(context).textTheme.titleLarge,
                  ),
                  const SizedBox(height: 8),
                  Text(
                    widget.product.description,
                    style: TextStyle(
                      color: Colors.grey[700],
                      height: 1.5,
                    ),
                  ),
                  const SizedBox(height: 24),

                  // Stock Status
                  Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 12,
                      vertical: 8,
                    ),
                    decoration: BoxDecoration(
                      color: widget.product.stock > 0
                          ? Colors.green[100]
                          : Colors.red[100],
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: Text(
                      widget.product.stock > 0
                          ? 'In Stock (${widget.product.stock} available)'
                          : 'Out of Stock',
                      style: TextStyle(
                        color: widget.product.stock > 0
                            ? Colors.green[800]
                            : Colors.red[800],
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ),
                  const SizedBox(height: 24),

                  // Quantity Selector
                  if (widget.product.stock > 0) ...[
                    Text(
                      'Quantity',
                      style: Theme.of(context).textTheme.titleMedium,
                    ),
                    const SizedBox(height: 8),
                    Row(
                      children: [
                        GestureDetector(
                          onTap: _quantity > 1
                              ? () => setState(() => _quantity--)
                              : null,
                          child: Container(
                            width: 40,
                            height: 40,
                            decoration: BoxDecoration(
                              border: Border.all(
                                color: Colors.grey,
                              ),
                              borderRadius: BorderRadius.circular(8),
                            ),
                            child: const Icon(Icons.remove),
                          ),
                        ),
                        const SizedBox(width: 16),
                        Text(
                          '$_quantity',
                          style: const TextStyle(
                            fontSize: 18,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                        const SizedBox(width: 16),
                        GestureDetector(
                          onTap: _quantity < widget.product.stock
                              ? () => setState(() => _quantity++)
                              : null,
                          child: Container(
                            width: 40,
                            height: 40,
                            decoration: BoxDecoration(
                              border: Border.all(
                                color: Colors.grey,
                              ),
                              borderRadius: BorderRadius.circular(8),
                            ),
                            child: const Icon(Icons.add),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 24),
                  ],

                  // Add to Cart Button
                  if (widget.product.stock > 0)
                    Consumer<CartProvider>(
                      builder: (context, cartProvider, _) {
                        return SizedBox(
                          width: double.infinity,
                          child: ElevatedButton.icon(
                            icon: const Icon(Icons.shopping_cart),
                            label: const Text('Add to Cart'),
                            onPressed: () {
                              cartProvider.addItem(
                                CartItem(
                                  id: widget.product.id,
                                  name: widget.product.name,
                                  price: widget.product.price,
                                  quantity: _quantity,
                                  image: widget.product.image,
                                  productId: widget.product.id,
                                ),
                              );
                              ScaffoldMessenger.of(context)
                                  .showSnackBar(
                                SnackBar(
                                  content: Text(
                                    'Added $_quantity item(s) to cart',
                                  ),
                                  duration:
                                      const Duration(milliseconds: 800),
                                ),
                              );
                              Navigator.of(context).pop();
                            },
                          ),
                        );
                      },
                    ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

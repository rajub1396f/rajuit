import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:photo_view/photo_view.dart';
import 'package:cached_network_image/cached_network_image.dart';
import 'package:url_launcher/url_launcher.dart';
import '../../config/constants.dart';
import '../../models/product_model.dart';
import '../../providers/cart_provider.dart';
import '../../models/order_model.dart';

class ProductDetailScreen extends StatefulWidget {
  final ProductModel product;

  const ProductDetailScreen({
    super.key,
    required this.product,
  });

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
            // Product Image with Zoom
            GestureDetector(
              onTap: () {
                if (widget.product.image != null) {
                  _showImageZoom(context, widget.product.image!);
                }
              },
              child: Container(
                width: double.infinity,
                height: 350,
                color: Colors.grey[200],
                child: widget.product.image != null
                    ? CachedNetworkImage(
                        imageUrl: widget.product.image!,
                        fit: BoxFit.contain, // Changed from cover to contain for full image
                        placeholder: (context, url) => const Center(
                          child: CircularProgressIndicator(),
                        ),
                        errorWidget: (context, url, error) => const Icon(
                          Icons.image_not_supported,
                          size: 100,
                        ),
                      )
                    : const Icon(Icons.shopping_bag, size: 100),
              ),
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
            const SizedBox(height: 24),

            // Instagram Video Button
            if (widget.product.instagramVideoUrl != null && widget.product.instagramVideoUrl!.isNotEmpty) ...[
              Container(
                width: double.infinity,
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  gradient: const LinearGradient(
                    colors: [Color(0xFFE4405F), Color(0xFFC13584)],
                    begin: Alignment.topLeft,
                    end: Alignment.bottomRight,
                  ),
                  borderRadius: BorderRadius.circular(12),
                  boxShadow: [
                    BoxShadow(
                      color: const Color(0xFFE4405F).withOpacity(0.3),
                      blurRadius: 8,
                      offset: const Offset(0, 4),
                    ),
                  ],
                ),
                child: Column(
                  children: [
                    const Icon(
                      Icons.play_circle_filled,
                      color: Colors.white,
                      size: 32,
                    ),
                    const SizedBox(height: 8),
                    const Text(
                      'Watch Product Demo',
                      style: TextStyle(
                        color: Colors.white,
                        fontSize: 16,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    const SizedBox(height: 4),
                    const Text(
                      'See this product in action on Instagram',
                      style: TextStyle(
                        color: Colors.white70,
                        fontSize: 12,
                      ),
                    ),
                    const SizedBox(height: 12),
                    ElevatedButton(
                      style: ElevatedButton.styleFrom(
                        backgroundColor: Colors.white,
                        foregroundColor: const Color(0xFFE4405F),
                        padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
                      ),
                      onPressed: () => _openInstagramVideo(widget.product.instagramVideoUrl!),
                      child: const Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Icon(Icons.camera_alt, size: 18),
                          SizedBox(width: 8),
                          Text('Watch on Instagram'),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 24),
            ],          ],
        ),
      ),
    );
  }

  // Function to show image in zoom view
  void _showImageZoom(BuildContext context, String imageUrl) {
    showDialog(
      context: context,
      barrierDismissible: true,
      builder: (BuildContext context) {
        return Dialog(
          backgroundColor: Colors.black,
          insetPadding: EdgeInsets.zero,
          child: Stack(
            children: [
              // Full screen image with zoom
              Container(
                width: double.infinity,
                height: double.infinity,
                child: PhotoView(
                  imageProvider: CachedNetworkImageProvider(imageUrl),
                  backgroundDecoration: const BoxDecoration(
                    color: Colors.black,
                  ),
                  minScale: PhotoViewComputedScale.contained,
                  maxScale: PhotoViewComputedScale.covered * 3.0,
                  initialScale: PhotoViewComputedScale.contained,
                  heroAttributes: PhotoViewHeroAttributes(tag: imageUrl),
                ),
              ),
              // Close button
              Positioned(
                top: 40,
                right: 20,
                child: IconButton(
                  icon: const Icon(
                    Icons.close,
                    color: Colors.white,
                    size: 30,
                  ),
                  onPressed: () {
                    Navigator.of(context).pop();
                  },
                ),
              ),
              // Tap to close hint
              Positioned(
                bottom: 40,
                left: 0,
                right: 0,
                child: Container(
                  padding: const EdgeInsets.all(16),
                  child: const Text(
                    'Pinch to zoom • Tap to close',
                    textAlign: TextAlign.center,
                    style: TextStyle(
                      color: Colors.white70,
                      fontSize: 16,
                    ),
                  ),
                ),
              ),
            ],
          ),
        );
      },
    );
  }

  // Function to open Instagram video
  Future<void> _openInstagramVideo(String videoUrl) async {
    try {
      if (videoUrl.isEmpty) {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text('Instagram video URL is empty'),
              backgroundColor: Colors.red,
            ),
          );
        }
        return;
      }

      final Uri uri = Uri.parse(videoUrl);
      print('Attempting to open Instagram video: $videoUrl');
      
      // Try different launch modes
      bool launched = false;
      
      // First try: External application (Instagram app)
      try {
        if (await canLaunchUrl(uri)) {
          launched = await launchUrl(uri, mode: LaunchMode.externalApplication);
          print('External app launch result: $launched');
        }
      } catch (e) {
        print('External app launch failed: $e');
      }
      
      // Second try: Platform default (system chooser)
      if (!launched) {
        try {
          launched = await launchUrl(uri, mode: LaunchMode.platformDefault);
          print('Platform default launch result: $launched');
        } catch (e) {
          print('Platform default launch failed: $e');
        }
      }
      
      // Third try: In-app web view as fallback
      if (!launched) {
        try {
          launched = await launchUrl(uri, mode: LaunchMode.inAppWebView);
          print('In-app web view launch result: $launched');
        } catch (e) {
          print('In-app web view launch failed: $e');
        }
      }
      
      if (!launched && mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: const Text('Could not open Instagram video. Try copying this link and opening it manually in Instagram app.'),
            backgroundColor: Colors.red,
            action: SnackBarAction(
              label: 'Copy Link',
              onPressed: () {
                // Copy URL to clipboard (you'll need to add clipboard package if needed)
                print('URL to copy: $videoUrl');
              },
            ),
          ),
        );
      }
    } catch (e) {
      print('Error in _openInstagramVideo: $e');
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Error opening Instagram video: $e'),
            backgroundColor: Colors.red,
          ),
        );
      }
    }
  }
}

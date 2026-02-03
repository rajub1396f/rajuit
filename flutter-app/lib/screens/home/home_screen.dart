import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:cached_network_image/cached_network_image.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../config/constants.dart';
import '../../models/order_model.dart';
import '../../providers/product_provider.dart';
import '../../providers/cart_provider.dart';
import '../product/product_detail_screen.dart';
import '../cart/cart_screen.dart';
import '../orders/orders_screen.dart';
import '../profile/profile_screen.dart';

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  int _currentIndex = 0;
  late PageController _pageController;
  late TextEditingController _searchController;

  @override
  void initState() {
    super.initState();
    _pageController = PageController();
    _searchController = TextEditingController();
    
    // Fetch products on init
    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<ProductProvider>().fetchProducts();
    });
  }

  @override
  void dispose() {
    _pageController.dispose();
    _searchController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Raju IT Fashion'),
        elevation: 0,
      ),
      body: PageView(
        controller: _pageController,
        onPageChanged: (index) {
          setState(() => _currentIndex = index);
        },
        children: [
          _buildProductsPage(),
          const CartScreen(),
          const OrdersScreen(),
          const ProfileScreen(),
        ],
      ),
      bottomNavigationBar: BottomNavigationBar(
        currentIndex: _currentIndex,
        backgroundColor: const Color(0xFF212529), // Dark blue background
        selectedItemColor: const Color(0xFFFFC800), // Yellow for selected
        unselectedItemColor: Colors.white70, // Light gray for unselected
        type: BottomNavigationBarType.fixed,
        elevation: 8,
        onTap: (index) {
          _pageController.animateToPage(
            index,
            duration: const Duration(milliseconds: 300),
            curve: Curves.easeInOut,
          );
        },
        items: [
          const BottomNavigationBarItem(
            icon: Icon(Icons.home),
            label: 'Home',
          ),
          BottomNavigationBarItem(
            icon: Stack(
              children: [
                const Icon(Icons.shopping_cart),
                Consumer<CartProvider>(
                  builder: (context, cartProvider, _) {
                    return cartProvider.itemCount > 0
                        ? Positioned(
                            right: 0,
                            top: 0,
                            child: Container(
                              padding: const EdgeInsets.all(2),
                              decoration: BoxDecoration(
                                color: const Color(0xFFFFC800),
                                borderRadius: BorderRadius.circular(10),
                              ),
                              constraints: const BoxConstraints(
                                minWidth: 18,
                                minHeight: 18,
                              ),
                              child: Text(
                                '${cartProvider.itemCount}',
                                style: const TextStyle(
                                  color: Color(0xFF212529),
                                  fontSize: 12,
                                  fontWeight: FontWeight.bold,
                                ),
                                textAlign: TextAlign.center,
                              ),
                            ),
                          )
                        : const SizedBox();
                  },
                ),
              ],
            ),
            label: 'Cart',
          ),
          const BottomNavigationBarItem(
            icon: Icon(Icons.list_alt),
            label: 'Orders',
          ),
          const BottomNavigationBarItem(
            icon: Icon(Icons.person),
            label: 'Profile',
          ),
        ],
      ),
    );
  }

  Widget _buildProductsPage() {
    return SingleChildScrollView(
      child: Column(
        children: [
          // Search Bar
          Padding(
            padding: const EdgeInsets.all(Constants.defaultPadding),
            child: TextField(
              controller: _searchController,
              decoration: InputDecoration(
                hintText: 'Search products...',
                prefixIcon: const Icon(Icons.search),
                suffixIcon: _searchController.text.isNotEmpty
                    ? IconButton(
                        icon: const Icon(Icons.clear),
                        onPressed: () {
                          _searchController.clear();
                          context.read<ProductProvider>().resetFilters();
                        },
                      )
                    : null,
              ),
              onChanged: (value) {
                context.read<ProductProvider>().searchProducts(value);
                setState(() {});
              },
            ),
          ),

          // Category Filter
          SizedBox(
            height: 50,
            child: ListView.builder(
              scrollDirection: Axis.horizontal,
              padding: const EdgeInsets.symmetric(
                horizontal: Constants.defaultPadding,
              ),
              itemCount: Constants.categories.length + 1,
              itemBuilder: (context, index) {
                final category =
                    index == 0 ? 'all' : Constants.categories[index - 1];
                final label = index == 0
                    ? 'All'
                    : Constants.categoryLabels[category] ?? category;

                return Padding(
                  padding: const EdgeInsets.only(right: 8),
                  child: Consumer<ProductProvider>(
                    builder: (context, productProvider, _) {
                      final isSelected =
                          productProvider.selectedCategory == category;

                      return FilterChip(
                        label: Text(label),
                        selected: isSelected,
                        onSelected: (selected) {
                          if (selected) {
                            if (category == 'all') {
                              productProvider.resetFilters();
                            } else {
                              productProvider
                                  .fetchProductsByCategory(category);
                            }
                          }
                        },
                      );
                    },
                  ),
                );
              },
            ),
          ),
          const SizedBox(height: 12),

          // Subcategory Filter (show only when category is selected)
          Consumer<ProductProvider>(
            builder: (context, productProvider, _) {
              final selectedCat = productProvider.selectedCategory;
              final hasSubcategories = selectedCat != 'all' &&
                  Constants.subcategories.containsKey(selectedCat);

              if (!hasSubcategories) {
                return const SizedBox.shrink();
              }

              final subcats = Constants.subcategories[selectedCat] ?? [];
              return SizedBox(
                height: 45,
                child: ListView.builder(
                  scrollDirection: Axis.horizontal,
                  padding: const EdgeInsets.symmetric(
                    horizontal: Constants.defaultPadding,
                  ),
                  itemCount: subcats.length,
                  itemBuilder: (context, index) {
                    final subcat = subcats[index];
                    final label =
                        Constants.subcategoryLabels[subcat] ?? subcat;

                    return Padding(
                      padding: const EdgeInsets.only(right: 8),
                      child: FilterChip(
                        label: Text(
                          label,
                          style: const TextStyle(fontSize: 12),
                        ),
                        selected: false,
                        onSelected: (selected) {
                          if (selected) {
                            productProvider.fetchProductsBySubcategory(
                              selectedCat,
                              subcat,
                            );
                          }
                        },
                      ),
                    );
                  },
                ),
              );
            },
          ),
          const SizedBox(height: 4),

          // Products Grid
          Consumer<ProductProvider>(
            builder: (context, productProvider, _) {
              if (productProvider.isLoading) {
                return const Padding(
                  padding: EdgeInsets.all(32),
                  child: CircularProgressIndicator(),
                );
              }

              if (productProvider.error != null) {
                return Padding(
                  padding: const EdgeInsets.all(32),
                  child: Column(
                    children: [
                      Text('Error: ${productProvider.error}'),
                      const SizedBox(height: 16),
                      ElevatedButton(
                        onPressed: () => productProvider.fetchProducts(),
                        child: const Text('Retry'),
                      ),
                    ],
                  ),
                );
              }

              final products = productProvider.products;
              if (products.isEmpty) {
                return const Padding(
                  padding: EdgeInsets.all(32),
                  child: Text('No products found'),
                );
              }

              return GridView.builder(
                shrinkWrap: true,
                physics: const NeverScrollableScrollPhysics(),
                padding: const EdgeInsets.all(Constants.defaultPadding),
                gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                  crossAxisCount: 2,
                  childAspectRatio: 0.7,
                  crossAxisSpacing: 12,
                  mainAxisSpacing: 12,
                ),
                itemCount: products.length,
                itemBuilder: (context, index) {
                  final product = products[index];

                  return GestureDetector(
                    onTap: () {
                      Navigator.of(context).push(
                        MaterialPageRoute(
                          builder: (_) =>
                              ProductDetailScreen(product: product),
                        ),
                      );
                    },
                    child: Card(
                      elevation: 2,
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          // Product Image
                          Expanded(
                            child: Container(
                              width: double.infinity,
                              color: Colors.grey[200],
                              child: product.image != null
                                  ? CachedNetworkImage(
                                      imageUrl: product.image!,
                                      fit: BoxFit.contain, // Changed to contain for full image
                                      placeholder: (context, url) => const Center(
                                        child: CircularProgressIndicator(),
                                      ),
                                      errorWidget: (context, url, error) => const Icon(
                                        Icons.image_not_supported,
                                        size: 50,
                                      ),
                                    )
                                  : const Icon(Icons.shopping_bag, size: 50),
                            ),
                          ),
                          // Product Info
                          Padding(
                            padding: const EdgeInsets.all(8),
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  product.name,
                                  maxLines: 2,
                                  overflow: TextOverflow.ellipsis,
                                  style: const TextStyle(
                                    fontWeight: FontWeight.bold,
                                  ),
                                ),
                                const SizedBox(height: 4),
                                Text(
                                  '৳${product.price.toStringAsFixed(2)}',
                                  style: const TextStyle(
                                    color: Color(0xFFFFC800),
                                    fontWeight: FontWeight.bold,
                                  ),
                                ),
                                const SizedBox(height: 4),
                                // Add to Cart Button
                                Consumer<CartProvider>(
                                  builder: (context, cartProvider, _) {
                                    return SizedBox(
                                      width: double.infinity,
                                      child: ElevatedButton(
                                        style:
                                            ElevatedButton.styleFrom(
                                          padding:
                                              const EdgeInsets.symmetric(
                                                vertical: 8,
                                              ),
                                          backgroundColor:
                                              const Color(0xFFFFC800),
                                        ),
                                        onPressed: () {
                                          cartProvider.addItem(
                                            CartItem(
                                              id: product.id,
                                              name: product.name,
                                              price: product.price,
                                              image: product.image,
                                              productId: product.id,
                                            ),
                                          );
                                          ScaffoldMessenger.of(
                                            context,
                                          ).showSnackBar(
                                            const SnackBar(
                                              content: Text(
                                                'Added to cart',
                                              ),
                                              duration: Duration(
                                                milliseconds: 500,
                                              ),
                                            ),
                                          );
                                        },
                                        child: const Text(
                                          'Add',
                                          style: TextStyle(
                                            color: Colors.black,
                                            fontSize: 12,
                                          ),
                                        ),
                                      ),
                                    );
                                  },
                                ),
                                // Instagram Video Button
                                if (product.instagramVideoUrl != null && product.instagramVideoUrl!.isNotEmpty)
                                  Padding(
                                    padding: const EdgeInsets.only(top: 4),
                                    child: SizedBox(
                                      width: double.infinity,
                                      child: OutlinedButton.icon(
                                        style: OutlinedButton.styleFrom(
                                          padding: const EdgeInsets.symmetric(vertical: 6),
                                          side: const BorderSide(color: Color(0xFFE4405F)),
                                          foregroundColor: const Color(0xFFE4405F),
                                        ),
                                        onPressed: () => _openInstagramVideo(product.instagramVideoUrl!),
                                        icon: const Icon(Icons.play_circle_outline, size: 16),
                                        label: const Text(
                                          'Watch Video',
                                          style: TextStyle(fontSize: 10),
                                        ),
                                      ),
                                    ),
                                  ),

                              ],
                            ),
                          ),
                        ],
                      ),
                    ),
                  );
                },
              );
            },
          ),
        ],
      ),
    );
  }

  // Open Instagram function
  Future<void> _openInstagram() async {
    try {
      const String instagramUrl = 'https://www.instagram.com/rajuit1396/?igsh=MWZlOHk4bWxrY3hwMg%3D%3D&fbclid=IwY2xjawOXwtFleHRuA2FlbQIxMABicklkETFXaXJyMnR5aWF3eHB2SVl4c3J0YwZhcHBfaWQQMjIyMDM5MTc4ODIwMDg5MgABHmKxgCF0yvOPwVkc5ovEt0JNh-K_DZ4egj27cYWVsba8m6bRIbTOszGrRkTA_aem_wyHdzWPSdl7DxeJ2So-lUw&brid=JbRWKsUzQoW71PD4MGNTnw';
      final Uri uri = Uri.parse(instagramUrl);
      
      if (await canLaunchUrl(uri)) {
        await launchUrl(uri, mode: LaunchMode.externalApplication);
      } else {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text('Could not open Instagram. Please check if the Instagram app is installed.'),
              backgroundColor: Colors.red,
            ),
          );
        }
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Error opening Instagram: $e'),
            backgroundColor: Colors.red,
          ),
        );
      }
    }
  }

  // Open Instagram Video function
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

import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:url_launcher/url_launcher.dart';
import 'dart:async';
import 'package:dio/dio.dart';
import '../../providers/order_provider.dart';
import '../../services/storage_service.dart';
import '../../services/api_service.dart';

class OrderConfirmationScreen extends StatefulWidget {
  final int orderId;

  const OrderConfirmationScreen({
    required this.orderId,
    super.key,
  });

  @override
  State<OrderConfirmationScreen> createState() =>
      _OrderConfirmationScreenState();
}

class _OrderConfirmationScreenState extends State<OrderConfirmationScreen> {
  late Future<void> _invoiceFuture;
  String? _invoiceUrl;
  bool _isLoadingInvoice = false;
  String? _invoiceError;
  int _refreshAttempts = 0;
  Timer? _autoRefreshTimer;
  final ApiService _apiService = ApiService();
  bool _isSendingEmail = false;
  String? _emailStatus; // Track email status message

  @override
  void initState() {
    super.initState();
    _invoiceFuture = _loadInvoice();
    // Auto-refresh invoice every 3 seconds for up to 30 seconds
    _startAutoRefresh();
  }

  void _startAutoRefresh() {
    _autoRefreshTimer = Timer.periodic(const Duration(seconds: 3), (_) {
      if (mounted && _refreshAttempts < 10) {
        _refreshAttempts++;
        setState(() {
          _invoiceFuture = _loadInvoice();
        });
      } else {
        _autoRefreshTimer?.cancel();
      }
    });
  }

  Future<void> _loadInvoice() async {
    if (!mounted) return;

    setState(() {
      _isLoadingInvoice = true;
      _invoiceError = null;
    });

    try {
      final orderProvider = context.read<OrderProvider>();

      // First check OrderProvider's orders list (most up-to-date)
      final orders = orderProvider.orders;
      final currentOrder =
          orders.firstWhereOrNull((o) => o.id == widget.orderId);

      if (currentOrder != null &&
          currentOrder.invoicePdfUrl != null &&
          currentOrder.invoicePdfUrl!.isNotEmpty) {
        if (mounted) {
          setState(() {
            _invoiceUrl = currentOrder.invoicePdfUrl;
            _isLoadingInvoice = false;
          });
          // Stop auto-refresh once invoice is loaded
          _autoRefreshTimer?.cancel();
        }
        return;
      }

      // If not found in provider, try secure method (with JWT)
      try {
        final invoice = await _apiService.getInvoiceSecure(widget.orderId);
        if (mounted) {
          setState(() {
            _invoiceUrl = invoice;
            _isLoadingInvoice = false;
          });
          // Stop auto-refresh once invoice is loaded
          _autoRefreshTimer?.cancel();
        }
      } catch (e) {
        // Fallback to regular get-invoice endpoint
        final token = await StorageService.getToken();
        if (token != null && mounted) {
          final pdfUrl = await orderProvider.getInvoicePdfUrl(widget.orderId);
          if (mounted) {
            setState(() {
              _invoiceUrl = pdfUrl;
              _isLoadingInvoice = false;
            });
            if (pdfUrl != null) {
              _autoRefreshTimer?.cancel();
            }
          }
        }
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _invoiceError = e.toString();
          _isLoadingInvoice = false;
        });
      }
    }
  }

  @override
  void dispose() {
    _autoRefreshTimer?.cancel();
    super.dispose();
  }

  void _viewInvoice() async {
    if (_invoiceUrl == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Invoice not available yet')),
      );
      return;
    }

    try {
      final uri = Uri.parse(_invoiceUrl!);
      if (await canLaunchUrl(uri)) {
        await launchUrl(uri, mode: LaunchMode.externalApplication);
      } else {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('Could not open invoice')),
          );
        }
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error: $e')),
        );
      }
    }
  }

  void _downloadInvoice() async {
    if (_invoiceUrl == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Invoice not available yet')),
      );
      return;
    }

    try {
      final uri = Uri.parse(_invoiceUrl!);
      if (await canLaunchUrl(uri)) {
        await launchUrl(uri, mode: LaunchMode.externalApplication);
      } else {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('Could not download invoice')),
          );
        }
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error: $e')),
        );
      }
    }
  }

  void _sendInvoiceEmail() async {
    if (_isSendingEmail) return;

    setState(() {
      _isSendingEmail = true;
      _emailStatus = null; // Clear previous status
    });

    try {
      const String baseUrl = 'https://rajuit.online';
      final token = await StorageService.getToken();

      if (token == null) {
        throw Exception('Not authenticated');
      }

      final dio = Dio();
      final response = await dio.post(
        '$baseUrl/send-invoice-email/${widget.orderId}',
        options: Options(
          headers: {
            'Authorization': 'Bearer $token',
            'Content-Type': 'application/json',
          },
        ),
      );

      if (mounted) {
        setState(() {
          _isSendingEmail = false;
        });

        if (response.statusCode == 200) {
          setState(() {
            _emailStatus =
                '✅ Invoice sent successfully! Check your email.'; // Show on page
          });
          // Auto-dismiss after 5 seconds
          Future.delayed(const Duration(seconds: 5), () {
            if (mounted) {
              setState(() {
                _emailStatus = null;
              });
            }
          });
        } else {
          setState(() {
            _emailStatus =
                '❌ ${response.data['message'] ?? 'Failed to send invoice'}';
          });
        }
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _isSendingEmail = false;
          _emailStatus = '❌ Error: $e';
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Order Confirmation'),
        elevation: 0,
        automaticallyImplyLeading: false,
      ),
      body: FutureBuilder<void>(
        future: _invoiceFuture,
        builder: (context, snapshot) {
          return SingleChildScrollView(
            child: Padding(
              padding: const EdgeInsets.all(16.0),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  // Success Header
                  Container(
                    padding: const EdgeInsets.all(20),
                    decoration: BoxDecoration(
                      color: Colors.green[50],
                      border: Border.all(color: Colors.green[300]!),
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Column(
                      children: [
                        Icon(
                          Icons.check_circle,
                          color: Colors.green[600],
                          size: 64,
                        ),
                        const SizedBox(height: 16),
                        Text(
                          'Order Placed Successfully!',
                          style: Theme.of(context)
                              .textTheme
                              .headlineSmall
                              ?.copyWith(color: Colors.green[700]),
                          textAlign: TextAlign.center,
                        ),
                        const SizedBox(height: 8),
                        Text(
                          'Order #${widget.orderId.toString().padLeft(6, '0')}',
                          style: Theme.of(context)
                              .textTheme
                              .titleMedium
                              ?.copyWith(color: Colors.green[600]),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 24),

                  // Invoice Section
                  Text(
                    'Invoice',
                    style: Theme.of(context).textTheme.titleLarge,
                  ),
                  const SizedBox(height: 12),

                  // Invoice Loading/Ready Status
                  if (_isLoadingInvoice || _invoiceUrl == null)
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.stretch,
                      children: [
                        Container(
                          padding: const EdgeInsets.all(16),
                          decoration: BoxDecoration(
                            color: Colors.orange[50],
                            border: Border.all(color: Colors.orange[300]!),
                            borderRadius: BorderRadius.circular(8),
                          ),
                          child: Column(
                            children: [
                              const SizedBox(
                                width: 40,
                                height: 40,
                                child: CircularProgressIndicator(
                                  strokeWidth: 3,
                                ),
                              ),
                              const SizedBox(height: 12),
                              Text(
                                'Generating Invoice',
                                style: TextStyle(
                                  color: Colors.orange[800],
                                  fontWeight: FontWeight.w600,
                                ),
                              ),
                              const SizedBox(height: 4),
                              Text(
                                'Your invoice is being prepared. This may take a few moments.',
                                style: TextStyle(
                                  color: Colors.orange[700],
                                  fontSize: 12,
                                ),
                                textAlign: TextAlign.center,
                              ),
                              const SizedBox(height: 4),
                              Text(
                                'Attempt ${_refreshAttempts + 1}/10',
                                style: TextStyle(
                                  color: Colors.orange[600],
                                  fontSize: 11,
                                ),
                              ),
                            ],
                          ),
                        ),
                        const SizedBox(height: 12),
                        ElevatedButton.icon(
                          onPressed: _isSendingEmail ? null : _sendInvoiceEmail,
                          icon: _isSendingEmail
                              ? const SizedBox(
                                  width: 20,
                                  height: 20,
                                  child: CircularProgressIndicator(
                                    strokeWidth: 2,
                                    valueColor: AlwaysStoppedAnimation<Color>(
                                        Colors.white),
                                  ),
                                )
                              : const Icon(Icons.email),
                          label: Text(_isSendingEmail
                              ? 'Sending...'
                              : 'Send Invoice Email'),
                          style: ElevatedButton.styleFrom(
                            backgroundColor: Colors.blue,
                            foregroundColor: Colors.white,
                            padding: const EdgeInsets.symmetric(vertical: 12),
                          ),
                        ),
                      ],
                    )
                  else if (_invoiceError != null)
                    Container(
                      padding: const EdgeInsets.all(16),
                      decoration: BoxDecoration(
                        color: Colors.red[50],
                        border: Border.all(color: Colors.red[300]!),
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: Column(
                        children: [
                          Icon(
                            Icons.error_outline,
                            color: Colors.red[600],
                            size: 32,
                          ),
                          const SizedBox(height: 8),
                          Text(
                            'Could not load invoice',
                            style: TextStyle(
                              color: Colors.red[800],
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                          const SizedBox(height: 4),
                          Text(
                            _invoiceError ?? 'Unknown error',
                            style: TextStyle(
                              color: Colors.red[700],
                              fontSize: 12,
                            ),
                            textAlign: TextAlign.center,
                          ),
                        ],
                      ),
                    )
                  else
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.stretch,
                      children: [
                        Container(
                          padding: const EdgeInsets.all(16),
                          decoration: BoxDecoration(
                            color: Colors.green[50],
                            border: Border.all(color: Colors.green[300]!),
                            borderRadius: BorderRadius.circular(8),
                          ),
                          child: Column(
                            children: [
                              Icon(
                                Icons.check_circle,
                                color: Colors.green[600],
                                size: 32,
                              ),
                              const SizedBox(height: 8),
                              Text(
                                'Invoice Ready',
                                style: TextStyle(
                                  color: Colors.green[800],
                                  fontWeight: FontWeight.w600,
                                ),
                              ),
                            ],
                          ),
                        ),
                        const SizedBox(height: 12),
                        ElevatedButton.icon(
                          onPressed: _viewInvoice,
                          icon: const Icon(Icons.visibility),
                          label: const Text('View Invoice'),
                          style: ElevatedButton.styleFrom(
                            backgroundColor: const Color(0xFFFFC800),
                            foregroundColor: const Color(0xFF212529),
                            padding: const EdgeInsets.symmetric(vertical: 12),
                          ),
                        ),
                        const SizedBox(height: 8),
                        ElevatedButton.icon(
                          onPressed: _downloadInvoice,
                          icon: const Icon(Icons.download),
                          label: const Text('Download Invoice'),
                          style: ElevatedButton.styleFrom(
                            backgroundColor: const Color(0xFF212529),
                            foregroundColor: Colors.white,
                            padding: const EdgeInsets.symmetric(vertical: 12),
                          ),
                        ),
                        const SizedBox(height: 8),
                        // Show email status message if available
                        if (_emailStatus != null)
                          Container(
                            padding: const EdgeInsets.all(12),
                            margin: const EdgeInsets.only(bottom: 8),
                            decoration: BoxDecoration(
                              color: _emailStatus!.startsWith('✅')
                                  ? Colors.green[50]
                                  : Colors.red[50],
                              border: Border.all(
                                color: _emailStatus!.startsWith('✅')
                                    ? Colors.green[300]!
                                    : Colors.red[300]!,
                              ),
                              borderRadius: BorderRadius.circular(8),
                            ),
                            child: Row(
                              children: [
                                Icon(
                                  _emailStatus!.startsWith('✅')
                                      ? Icons.check_circle
                                      : Icons.error,
                                  color: _emailStatus!.startsWith('✅')
                                      ? Colors.green
                                      : Colors.red,
                                ),
                                const SizedBox(width: 12),
                                Expanded(
                                  child: Text(
                                    _emailStatus!,
                                    style: TextStyle(
                                      color: _emailStatus!.startsWith('✅')
                                          ? Colors.green[700]
                                          : Colors.red[700],
                                    ),
                                  ),
                                ),
                                IconButton(
                                  icon: const Icon(Icons.close),
                                  onPressed: () {
                                    setState(() {
                                      _emailStatus = null;
                                    });
                                  },
                                  padding: EdgeInsets.zero,
                                  constraints: const BoxConstraints(),
                                ),
                              ],
                            ),
                          ),
                        ElevatedButton.icon(
                          onPressed: _isSendingEmail ? null : _sendInvoiceEmail,
                          icon: _isSendingEmail
                              ? const SizedBox(
                                  width: 20,
                                  height: 20,
                                  child: CircularProgressIndicator(
                                    strokeWidth: 2,
                                    valueColor: AlwaysStoppedAnimation<Color>(
                                        Colors.white),
                                  ),
                                )
                              : const Icon(Icons.email),
                          label: Text(_isSendingEmail
                              ? 'Sending...'
                              : 'Send Invoice Email'),
                          style: ElevatedButton.styleFrom(
                            backgroundColor: Colors.blue,
                            foregroundColor: Colors.white,
                            padding: const EdgeInsets.symmetric(vertical: 12),
                          ),
                        ),
                      ],
                    ),

                  const SizedBox(height: 24),

                  // Next Steps
                  Text(
                    'What\'s Next?',
                    style: Theme.of(context).textTheme.titleLarge,
                  ),
                  const SizedBox(height: 12),
                  Container(
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(
                      color: Colors.grey[100],
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        _buildNextStep(
                          '1',
                          'Order Confirmation',
                          'Check your email for order details',
                        ),
                        const SizedBox(height: 12),
                        _buildNextStep(
                          '2',
                          'Processing',
                          'Your order is being processed',
                        ),
                        const SizedBox(height: 12),
                        _buildNextStep(
                          '3',
                          'Shipping',
                          'You\'ll receive shipping updates',
                        ),
                        const SizedBox(height: 12),
                        _buildNextStep(
                          '4',
                          'Delivery',
                          'Track your package in real-time',
                        ),
                      ],
                    ),
                  ),

                  const SizedBox(height: 24),

                  // Action Buttons
                  ElevatedButton(
                    onPressed: () {
                      Navigator.of(context)
                          .pushNamedAndRemoveUntil('/', (route) => false);
                    },
                    style: ElevatedButton.styleFrom(
                      backgroundColor: const Color(0xFFFFC800),
                      foregroundColor: const Color(0xFF212529),
                      padding: const EdgeInsets.symmetric(vertical: 12),
                    ),
                    child: const Text('Continue Shopping'),
                  ),
                  const SizedBox(height: 8),
                  ElevatedButton(
                    onPressed: () {
                      Navigator.of(context).pushNamedAndRemoveUntil(
                        '/orders',
                        (route) => false,
                      );
                    },
                    style: ElevatedButton.styleFrom(
                      backgroundColor: const Color(0xFF212529),
                      foregroundColor: Colors.white,
                      padding: const EdgeInsets.symmetric(vertical: 12),
                    ),
                    child: const Text('View All Orders'),
                  ),
                ],
              ),
            ),
          );
        },
      ),
    );
  }

  Widget _buildNextStep(String number, String title, String description) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Container(
          width: 32,
          height: 32,
          decoration: BoxDecoration(
            color: const Color(0xFFFFC800),
            borderRadius: BorderRadius.circular(16),
          ),
          child: Center(
            child: Text(
              number,
              style: const TextStyle(
                color: Color(0xFF212529),
                fontWeight: FontWeight.bold,
              ),
            ),
          ),
        ),
        const SizedBox(width: 12),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                title,
                style: const TextStyle(
                  fontWeight: FontWeight.w600,
                  fontSize: 14,
                ),
              ),
              const SizedBox(height: 4),
              Text(
                description,
                style: TextStyle(
                  color: Colors.grey[600],
                  fontSize: 12,
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }
}

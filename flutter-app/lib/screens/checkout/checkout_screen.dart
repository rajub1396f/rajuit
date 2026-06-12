import 'dart:async';

import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../config/constants.dart';
import '../../models/order_model.dart';
import '../../providers/auth_provider.dart';
import '../../providers/cart_provider.dart';
import '../../providers/order_provider.dart';
import '../../services/storage_service.dart';

class CheckoutScreen extends StatefulWidget {
  final List<CartItem> cartItems;
  final double totalAmount;

  const CheckoutScreen({
    super.key,
    required this.cartItems,
    required this.totalAmount,
  });

  @override
  State<CheckoutScreen> createState() => _CheckoutScreenState();
}

class _CheckoutScreenState extends State<CheckoutScreen> {
  late TextEditingController _firstNameController;
  late TextEditingController _lastNameController;
  late TextEditingController _emailController;
  late TextEditingController _phoneController;
  late TextEditingController _address1Controller;
  late TextEditingController _address2Controller;
  late TextEditingController _upzillaController;
  late TextEditingController _cityController;
  late TextEditingController _divisionController;
  late TextEditingController _postalCodeController;
  late TextEditingController _countryController;
  String _selectedPaymentMethod = 'cod';
  final _formKey = GlobalKey<FormState>();
  Timer? _saveAddressDebounce;

  @override
  void initState() {
    super.initState();
    _firstNameController = TextEditingController();
    _lastNameController = TextEditingController();
    _emailController = TextEditingController();
    _phoneController = TextEditingController();
    _address1Controller = TextEditingController();
    _address2Controller = TextEditingController();
    _upzillaController = TextEditingController();
    _cityController = TextEditingController();
    _divisionController = TextEditingController();
    _postalCodeController = TextEditingController();
    _countryController = TextEditingController(text: 'Bangladesh');
    _loadSavedShippingAddress();
    _addShippingAddressListeners();
  }

  @override
  void dispose() {
    _saveAddressDebounce?.cancel();
    _firstNameController.dispose();
    _lastNameController.dispose();
    _emailController.dispose();
    _phoneController.dispose();
    _address1Controller.dispose();
    _address2Controller.dispose();
    _upzillaController.dispose();
    _cityController.dispose();
    _divisionController.dispose();
    _postalCodeController.dispose();
    _countryController.dispose();
    super.dispose();
  }

  void _addShippingAddressListeners() {
    for (final controller in [
      _firstNameController,
      _lastNameController,
      _emailController,
      _phoneController,
      _address1Controller,
      _address2Controller,
      _upzillaController,
      _cityController,
      _divisionController,
      _postalCodeController,
      _countryController,
    ]) {
      controller.addListener(_scheduleAddressSave);
    }
  }

  Future<void> _loadSavedShippingAddress() async {
    final savedAddress = await StorageService.getShippingAddressFields();

    if (!mounted || savedAddress.isEmpty) return;

    setState(() {
      _firstNameController.text = savedAddress['firstName'] ?? '';
      _lastNameController.text = savedAddress['lastName'] ?? '';
      _emailController.text = savedAddress['email'] ?? '';
      _phoneController.text = savedAddress['phone'] ?? '';
      _address1Controller.text = savedAddress['address1'] ?? '';
      _address2Controller.text = savedAddress['address2'] ?? '';
      _upzillaController.text = savedAddress['upzilla'] ?? '';
      _cityController.text = savedAddress['city'] ?? '';
      _divisionController.text = savedAddress['division'] ?? '';
      _postalCodeController.text = savedAddress['postalCode'] ?? '';
      _countryController.text = savedAddress['country']?.isNotEmpty == true
          ? savedAddress['country']!
          : 'Bangladesh';
    });
  }

  void _scheduleAddressSave() {
    _saveAddressDebounce?.cancel();
    _saveAddressDebounce = Timer(
      const Duration(milliseconds: 500),
      _saveShippingAddressDraft,
    );
  }

  Future<void> _saveShippingAddressDraft() async {
    await StorageService.saveShippingAddressFields(_shippingAddressFields());

    final profileAddress = _buildProfileAddress();
    if (profileAddress.isNotEmpty && mounted) {
      await context.read<AuthProvider>().updateLocalAddress(profileAddress);
    }
  }

  Map<String, String> _shippingAddressFields() {
    return {
      'firstName': _firstNameController.text.trim(),
      'lastName': _lastNameController.text.trim(),
      'email': _emailController.text.trim(),
      'phone': _phoneController.text.trim(),
      'address1': _address1Controller.text.trim(),
      'address2': _address2Controller.text.trim(),
      'upzilla': _upzillaController.text.trim(),
      'city': _cityController.text.trim(),
      'division': _divisionController.text.trim(),
      'postalCode': _postalCodeController.text.trim(),
      'country': _countryController.text.trim(),
    };
  }

  String _buildProfileAddress() {
    final address2 = _address2Controller.text.trim();
    final addressParts = [
      _address1Controller.text.trim(),
      if (address2.isNotEmpty) address2,
      _upzillaController.text.trim(),
      _cityController.text.trim(),
      '${_divisionController.text.trim()} ${_postalCodeController.text.trim()}'
          .trim(),
    ].where((part) => part.trim().isNotEmpty).toList();

    if (addressParts.isEmpty) return '';

    return [
      ...addressParts,
      _countryController.text.trim(),
    ].where((part) => part.trim().isNotEmpty).join(', ');
  }

  String _buildShippingAddress() {
    final firstName = _firstNameController.text.trim();
    final lastName = _lastNameController.text.trim();
    final address2 = _address2Controller.text.trim();

    return [
      '$firstName $lastName',
      _address1Controller.text.trim(),
      if (address2.isNotEmpty) address2,
      _upzillaController.text.trim(),
      _cityController.text.trim(),
      '${_divisionController.text.trim()} ${_postalCodeController.text.trim()}',
      '${_countryController.text.trim()}. Phone: ${_phoneController.text.trim()}',
    ].where((part) => part.trim().isNotEmpty).join(', ');
  }

  void _handleCreateOrder() async {
    if (_formKey.currentState!.validate()) {
      final cartProvider = context.read<CartProvider>();
      final orderProvider = context.read<OrderProvider>();
      await _saveShippingAddressDraft();

      final orderRequest = CreateOrderRequest(
        items: cartProvider.getOrderItems(),
        totalAmount: widget.totalAmount,
        shippingAddress: _buildShippingAddress(),
        paymentMethod: _selectedPaymentMethod,
      );

      final success = await orderProvider.createOrder(orderRequest);

      if (!mounted) return;

      if (success) {
        cartProvider.clearCart();

        // Navigate to order confirmation screen with the newly created order
        if (orderProvider.orders.isNotEmpty) {
          final newOrder = orderProvider.orders.first;
          Navigator.of(context).pushReplacementNamed(
            '/order-confirmation',
            arguments: newOrder.id,
          );
        } else {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('Order created successfully!')),
          );
          Navigator.of(context).popUntil((route) => route.isFirst);
        }
      } else {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(
              orderProvider.error ?? 'Failed to create order',
            ),
          ),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Checkout'),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.fromLTRB(
          Constants.defaultPadding,
          Constants.defaultPadding,
          Constants.defaultPadding,
          Constants.helpButtonBottomClearance,
        ),
        child: Form(
          key: _formKey,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Order Summary
              _buildSectionTitle('Order Summary'),
              const SizedBox(height: 12),
              Card(
                child: Padding(
                  padding: const EdgeInsets.all(12),
                  child: Column(
                    children: [
                      ...widget.cartItems.map((item) {
                        return Padding(
                          padding: const EdgeInsets.only(bottom: 8),
                          child: Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              Text('${item.name} x${item.quantity}'),
                              Text(
                                '৳${(item.price * item.quantity).toStringAsFixed(2)}',
                              ),
                            ],
                          ),
                        );
                      }),
                      const Divider(),
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          const Text(
                            'Total:',
                            style: TextStyle(fontWeight: FontWeight.bold),
                          ),
                          Text(
                            '৳${widget.totalAmount.toStringAsFixed(2)}',
                            style: const TextStyle(
                              fontWeight: FontWeight.bold,
                              color: Color(0xFFFFC800),
                              fontSize: 18,
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
              ),
              const SizedBox(height: 24),

              // Shipping Address
              _buildSectionTitle('Shipping Address'),
              const SizedBox(height: 12),
              Card(
                child: Padding(
                  padding: const EdgeInsets.all(12),
                  child: Column(
                    children: [
                      Row(
                        children: [
                          Expanded(
                            child: _buildShippingField(
                              controller: _firstNameController,
                              label: 'First Name',
                              requiredMessage: 'First name is required',
                            ),
                          ),
                          const SizedBox(width: 12),
                          Expanded(
                            child: _buildShippingField(
                              controller: _lastNameController,
                              label: 'Last Name',
                              requiredMessage: 'Last name is required',
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 12),
                      _buildShippingField(
                        controller: _emailController,
                        label: 'Email Address',
                        keyboardType: TextInputType.emailAddress,
                        requiredMessage: 'Email address is required',
                        validator: (value) {
                          if (value == null || value.trim().isEmpty) {
                            return 'Email address is required';
                          }
                          if (!RegExp(Constants.emailPattern)
                              .hasMatch(value.trim())) {
                            return 'Enter a valid email address';
                          }
                          return null;
                        },
                      ),
                      const SizedBox(height: 12),
                      _buildShippingField(
                        controller: _phoneController,
                        label: 'Phone Number',
                        keyboardType: TextInputType.phone,
                        requiredMessage: 'Phone number is required',
                      ),
                      const SizedBox(height: 12),
                      _buildShippingField(
                        controller: _address1Controller,
                        label: 'Address Line 1',
                        hintText: 'Street address, P.O. box',
                        requiredMessage: 'Address line 1 is required',
                      ),
                      const SizedBox(height: 12),
                      _buildShippingField(
                        controller: _address2Controller,
                        label: 'Address Line 2',
                        hintText:
                            'Apartment, suite, unit, building, floor, etc.',
                        isRequired: false,
                      ),
                      const SizedBox(height: 12),
                      Row(
                        children: [
                          Expanded(
                            child: _buildShippingField(
                              controller: _upzillaController,
                              label: 'Upzilla/Thana',
                              requiredMessage: 'Upzilla/Thana is required',
                            ),
                          ),
                          const SizedBox(width: 12),
                          Expanded(
                            child: _buildShippingField(
                              controller: _cityController,
                              label: 'City/Zilla',
                              requiredMessage: 'City/Zilla is required',
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 12),
                      Row(
                        children: [
                          Expanded(
                            child: _buildShippingField(
                              controller: _divisionController,
                              label: 'Division',
                              requiredMessage: 'Division is required',
                            ),
                          ),
                          const SizedBox(width: 12),
                          Expanded(
                            child: _buildShippingField(
                              controller: _postalCodeController,
                              label: 'Postal Code',
                              keyboardType: TextInputType.number,
                              requiredMessage: 'Postal code is required',
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 12),
                      _buildShippingField(
                        controller: _countryController,
                        label: 'Country',
                        readOnly: true,
                        requiredMessage: 'Country is required',
                      ),
                    ],
                  ),
                ),
              ),
              const SizedBox(height: 24),

              // Payment Method
              _buildSectionTitle('Payment Method'),
              const SizedBox(height: 12),
              Card(
                child: Padding(
                  padding: const EdgeInsets.all(12),
                  child: Column(
                    children: [
                      ...Constants.paymentMethods.entries.map((entry) {
                        return RadioListTile(
                          title: Text(entry.value),
                          value: entry.key,
                          groupValue: _selectedPaymentMethod,
                          onChanged: (value) {
                            setState(() {
                              _selectedPaymentMethod = value ?? 'cod';
                            });
                          },
                        );
                      }),
                    ],
                  ),
                ),
              ),
              const SizedBox(height: 32),

              // Place Order Button
              Consumer<OrderProvider>(
                builder: (context, orderProvider, _) {
                  return SizedBox(
                    width: double.infinity,
                    child: ElevatedButton(
                      onPressed:
                          orderProvider.isCreating ? null : _handleCreateOrder,
                      child: orderProvider.isCreating
                          ? const SizedBox(
                              height: 20,
                              width: 20,
                              child: CircularProgressIndicator(
                                strokeWidth: 2,
                              ),
                            )
                          : const Text('Place Order'),
                    ),
                  );
                },
              ),
              const SizedBox(height: 16),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildSectionTitle(String title) {
    return Text(
      title,
      style: const TextStyle(
        fontSize: 16,
        fontWeight: FontWeight.bold,
      ),
    );
  }

  Widget _buildShippingField({
    required TextEditingController controller,
    required String label,
    String? hintText,
    String? requiredMessage,
    bool isRequired = true,
    bool readOnly = false,
    TextInputType? keyboardType,
    String? Function(String?)? validator,
  }) {
    return TextFormField(
      controller: controller,
      readOnly: readOnly,
      keyboardType: keyboardType,
      decoration: InputDecoration(
        labelText: isRequired ? '$label *' : label,
        hintText: hintText,
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(8),
        ),
      ),
      validator: validator ??
          (value) {
            if (isRequired && (value == null || value.trim().isEmpty)) {
              return requiredMessage ?? '$label is required';
            }
            return null;
          },
    );
  }
}

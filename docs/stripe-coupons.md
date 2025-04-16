---
title: Add discounts
subtitle: Reduce the amount charged to a customer by discounting their subtotal with coupons and promotion codes.
route: /payments/checkout/discounts
---

# Add discounts

Reduce the amount charged to a customer by discounting their subtotal with coupons and promotion codes.

# Stripe-hosted page

> This is a Stripe-hosted page for when payment-ui is stripe-hosted. View the original doc at https://docs.stripe.com/payments/checkout/discounts?payment-ui=stripe-hosted.

You can use discounts to reduce the amount charged to a customer. Coupons and promotion codes allow you to:

- Apply a discount to an entire purchase subtotal
- Apply a discount to specific products
- Reduce the total charged by a percentage or a flat amount
- Create customer-facing promotion codes on top of coupons to share directly with customers

To use coupons for discounting *subscriptions* with Checkout and Billing, see [Discounts for subscriptions](https://docs.stripe.com/billing/subscriptions/coupons.md).

## Create a coupon

Coupons specify a fixed value discount. You can create customer-facing promotion codes that map to a single underlying coupon. This means that the codes `FALLPROMO` and `SPRINGPROMO` can both point to one 25% off coupon. You can create coupons in the [Dashboard](https://dashboard.stripe.com/coupons) or with the [API](https://docs.stripe.com/api.md#coupons):

```dotnet
StripeConfiguration.ApiKey = "<<secret key>>";

var options = new CouponCreateOptions { PercentOff = 20M, Duration = "once" };
var service = new CouponService();
service.Create(options);
```

```go
stripe.Key = "<<secret key>>"

params := &stripe.CouponParams{
  PercentOff: stripe.Float64(20),
  Duration: stripe.String(string(stripe.CouponDurationOnce)),
};
result, err := coupon.New(params);
```

```java
Stripe.apiKey = "<<secret key>>";

CouponCreateParams params =
  CouponCreateParams.builder()
    .setPercentOff(new BigDecimal(20))
    .setDuration(CouponCreateParams.Duration.ONCE)
    .build();

Coupon coupon = Coupon.create(params);
```

```node
const stripe = require('stripe')('<<secret key>>');

const coupon = await stripe.coupons.create({
  percent_off: 20,
  duration: 'once',
});
```

```python
import stripe
stripe.api_key = "<<secret key>>"

stripe.Coupon.create(
  percent_off=20,
  duration="once",
)
```

```php
$stripe = new \Stripe\StripeClient('<<secret key>>');

$stripe->coupons->create([
  'percent_off' => 20,
  'duration' => 'once',
]);
```

```ruby
Stripe.api_key = '<<secret key>>'

Stripe::Coupon.create({
  percent_off: 20,
  duration: 'once',
})
```

## Use a coupon

To create a session with an applied discount, pass the [coupon ID](https://docs.stripe.com/api/coupons/object.md#coupon_object-id) in the `coupon` parameter of the [discounts](https://docs.stripe.com/api/checkout/sessions/create.md#create_checkout_session-discounts) array. Checkout currently supports up to one coupon or promotion code.

```dotnet
StripeConfiguration.ApiKey = "<<secret key>>";

var options = new Stripe.Checkout.SessionCreateOptions
{
    LineItems = new List<Stripe.Checkout.SessionLineItemOptions>
    {
        new Stripe.Checkout.SessionLineItemOptions { Price = "<<price>>", Quantity = 1 },
    },
    Discounts = new List<Stripe.Checkout.SessionDiscountOptions>
    {
        new Stripe.Checkout.SessionDiscountOptions { Coupon = "<<coupon>>" },
    },
    Mode = "payment",
    SuccessUrl = "https://example.com/success",
    CancelUrl = "https://example.com/cancel",
};
var service = new Stripe.Checkout.SessionService();
service.Create(options);
```

```go
stripe.Key = "<<secret key>>"

params := &stripe.CheckoutSessionParams{
  LineItems: []*stripe.CheckoutSessionLineItemParams{
    &stripe.CheckoutSessionLineItemParams{
      Price: stripe.String("<<price>>"),
      Quantity: stripe.Int64(1),
    },
  },
  Discounts: []*stripe.CheckoutSessionDiscountParams{
    &stripe.CheckoutSessionDiscountParams{Coupon: stripe.String("<<coupon>>")},
  },
  Mode: stripe.String(string(stripe.CheckoutSessionModePayment)),
  SuccessURL: stripe.String("https://example.com/success"),
  CancelURL: stripe.String("https://example.com/cancel"),
};
result, err := session.New(params);
```

```java
Stripe.apiKey = "<<secret key>>";

SessionCreateParams params =
  SessionCreateParams.builder()
    .addLineItem(
      SessionCreateParams.LineItem.builder().setPrice("<<price>>").setQuantity(1L).build()
    )
    .addDiscount(SessionCreateParams.Discount.builder().setCoupon("<<coupon>>").build())
    .setMode(SessionCreateParams.Mode.PAYMENT)
    .setSuccessUrl("https://example.com/success")
    .setCancelUrl("https://example.com/cancel")
    .build();

Session session = Session.create(params);
```

```node
const stripe = require('stripe')('<<secret key>>');

const session = await stripe.checkout.sessions.create({
  line_items: [
    {
      price: '<<price>>',
      quantity: 1,
    },
  ],
  discounts: [
    {
      coupon: '<<coupon>>',
    },
  ],
  mode: 'payment',
  success_url: 'https://example.com/success',
  cancel_url: 'https://example.com/cancel',
});
```

```python
import stripe
stripe.api_key = "<<secret key>>"

stripe.checkout.Session.create(
  line_items=[{"price": "<<price>>", "quantity": 1}],
  discounts=[{"coupon": "<<coupon>>"}],
  mode="payment",
  success_url="https://example.com/success",
  cancel_url="https://example.com/cancel",
)
```

```php
$stripe = new \Stripe\StripeClient('<<secret key>>');

$stripe->checkout->sessions->create([
  'line_items' => [
    [
      'price' => '<<price>>',
      'quantity' => 1,
    ],
  ],
  'discounts' => [['coupon' => '<<coupon>>']],
  'mode' => 'payment',
  'success_url' => 'https://example.com/success',
  'cancel_url' => 'https://example.com/cancel',
]);
```

```ruby
Stripe.api_key = '<<secret key>>'

Stripe::Checkout::Session.create({
  line_items: [
    {
      price: '<<price>>',
      quantity: 1,
    },
  ],
  discounts: [{coupon: '<<coupon>>'}],
  mode: 'payment',
  success_url: 'https://example.com/success',
  cancel_url: 'https://example.com/cancel',
})
```

## Configure a coupon

Coupons have the following parameters that you can use:

* `currency`
* `percent_off` or `amount_off`
* `max_redemptions`
* `redeem_by`, the latest date customers can apply the coupon
* `applies_to`, limits the products that the coupon applies to

The coupon object adds discounts to both one-time payments and subscriptions. Some coupon object parameters, like `duration`, only apply to [subscriptions](https://docs.stripe.com/billing/subscriptions/coupons.md).

### Limit redemption usage

The `max_redemptions` and `redeem_by` values apply to the coupon across every application. For example, you can restrict a coupon to the first 50 usages of it, or you can make a coupon expire by a certain date.

### Limit eligible products

You can limit the products that are eligible for discounts using a coupon by adding the product IDs to the `applies_to` hash in the Coupon object. Any promotion codes that map to this coupon only apply to the list of eligible products.

### Delete a coupon

You can delete coupons in the Dashboard or the API. Deleting a coupon prevents it from being applied to future transactions or customers.

## Create a promotion code

Promotion codes are customer-facing codes created on top of coupons. You can also specify additional restrictions that control when a customer can apply the promotion. You can share these codes with customers who can enter them during checkout to apply a discount.

To create a [promotion code](https://docs.stripe.com/api/promotion_codes.md), specify an existing `coupon` and any restrictions (for example, limiting it to a specific `customer`). If you have a specific code to give to your customer (for example, `FALL25OFF`), set the `code`. If you leave this field blank, we’ll generate a random `code` for you.

The `code` is case-insensitive and unique across active promotion codes for any customer. For example:

* You can create multiple customer-restricted promotion codes with the same `code`, but you can’t reuse that `code` for a promotion code redeemable by any customer.
* If you create a promotion code that is redeemable by any customer, you can’t create another active promotion code with the same `code`.
* You can create a promotion code with `code: NEWUSER`, inactivate it by passing `active: false`, and then create a new promotion code with `code: NEWUSER`.

Promotion codes can be created in the coupons section of the [Dashboard](https://dashboard.stripe.com/coupons/create) or with the [API](https://docs.stripe.com/api.md#promotion_codes):

```dotnet
StripeConfiguration.ApiKey = "<<secret key>>";

var options = new PromotionCodeCreateOptions { Coupon = "{{COUPON_ID}}", Code = "VIPCODE" };
var service = new PromotionCodeService();
service.Create(options);
```

```go
stripe.Key = "<<secret key>>"

params := &stripe.PromotionCodeParams{
  Coupon: stripe.String("{{COUPON_ID}}"),
  Code: stripe.String("VIPCODE"),
};
result, err := promotioncode.New(params);
```

```java
Stripe.apiKey = "<<secret key>>";

PromotionCodeCreateParams params =
  PromotionCodeCreateParams.builder().setCoupon("{{COUPON_ID}}").setCode("VIPCODE").build();

PromotionCode promotionCode = PromotionCode.create(params);
```

```node
const stripe = require('stripe')('<<secret key>>');

const promotionCode = await stripe.promotionCodes.create({
  coupon: '{{COUPON_ID}}',
  code: 'VIPCODE',
});
```

```python
import stripe
stripe.api_key = "<<secret key>>"

stripe.PromotionCode.create(
  coupon="{{COUPON_ID}}",
  code="VIPCODE",
)
```

```php
$stripe = new \Stripe\StripeClient('<<secret key>>');

$stripe->promotionCodes->create([
  'coupon' => '{{COUPON_ID}}',
  'code' => 'VIPCODE',
]);
```

```ruby
Stripe.api_key = '<<secret key>>'

Stripe::PromotionCode.create({
  coupon: '{{COUPON_ID}}',
  code: 'VIPCODE',
})
```

## Use a promotion code 

Enable customer-redeemable promotion codes using the [allow_promotion_codes](https://docs.stripe.com/api/checkout/sessions/object.md#checkout_session_object-allow_promotion_codes) parameter in a Checkout Session. This enables a field in Checkout to allow customers to input promotion codes.

```dotnet
StripeConfiguration.ApiKey = "<<secret key>>";

var options = new Stripe.Checkout.SessionCreateOptions
{
    LineItems = new List<Stripe.Checkout.SessionLineItemOptions>
    {
        new Stripe.Checkout.SessionLineItemOptions
        {
            PriceData = new Stripe.Checkout.SessionLineItemPriceDataOptions
            {
                UnitAmount = 2000,
                ProductData = new Stripe.Checkout.SessionLineItemPriceDataProductDataOptions
                {
                    Name = "T-shirt",
                },
                Currency = "usd",
            },
            Quantity = 1,
        },
    },
    Mode = "payment",
    AllowPromotionCodes = true,
    SuccessUrl = "https://example.com/success",
    CancelUrl = "https://example.com/cancel",
};
var service = new Stripe.Checkout.SessionService();
service.Create(options);
```

```go
stripe.Key = "<<secret key>>"

params := &stripe.CheckoutSessionParams{
  LineItems: []*stripe.CheckoutSessionLineItemParams{
    &stripe.CheckoutSessionLineItemParams{
      PriceData: &stripe.CheckoutSessionLineItemPriceDataParams{
        UnitAmount: stripe.Int64(2000),
        ProductData: &stripe.CheckoutSessionLineItemPriceDataProductDataParams{
          Name: stripe.String("T-shirt"),
        },
        Currency: stripe.String(string(stripe.CurrencyUSD)),
      },
      Quantity: stripe.Int64(1),
    },
  },
  Mode: stripe.String(string(stripe.CheckoutSessionModePayment)),
  AllowPromotionCodes: stripe.Bool(true),
  SuccessURL: stripe.String("https://example.com/success"),
  CancelURL: stripe.String("https://example.com/cancel"),
};
result, err := session.New(params);
```

```java
Stripe.apiKey = "<<secret key>>";

SessionCreateParams params =
  SessionCreateParams.builder()
    .addLineItem(
      SessionCreateParams.LineItem.builder()
        .setPriceData(
          SessionCreateParams.LineItem.PriceData.builder()
            .setUnitAmount(2000L)
            .setProductData(
              SessionCreateParams.LineItem.PriceData.ProductData.builder()
                .setName("T-shirt")
                .build()
            )
            .setCurrency("usd")
            .build()
        )
        .setQuantity(1L)
        .build()
    )
    .setMode(SessionCreateParams.Mode.PAYMENT)
    .setAllowPromotionCodes(true)
    .setSuccessUrl("https://example.com/success")
    .setCancelUrl("https://example.com/cancel")
    .build();

Session session = Session.create(params);
```

```node
const stripe = require('stripe')('<<secret key>>');

const session = await stripe.checkout.sessions.create({
  line_items: [
    {
      price_data: {
        unit_amount: 2000,
        product_data: {
          name: 'T-shirt',
        },
        currency: 'usd',
      },
      quantity: 1,
    },
  ],
  mode: 'payment',
  allow_promotion_codes: true,
  success_url: 'https://example.com/success',
  cancel_url: 'https://example.com/cancel',
});
```

```python
import stripe
stripe.api_key = "<<secret key>>"

stripe.checkout.Session.create(
  line_items=[
    {
      "price_data": {"unit_amount": 2000, "product_data": {"name": "T-shirt"}, "currency": "usd"},
      "quantity": 1,
    },
  ],
  mode="payment",
  allow_promotion_codes=True,
  success_url="https://example.com/success",
  cancel_url="https://example.com/cancel",
)
```

```php
$stripe = new \Stripe\StripeClient('<<secret key>>');

$stripe->checkout->sessions->create([
  'line_items' => [
    [
      'price_data' => [
        'unit_amount' => 2000,
        'product_data' => ['name' => 'T-shirt'],
        'currency' => 'usd',
      ],
      'quantity' => 1,
    ],
  ],
  'mode' => 'payment',
  'allow_promotion_codes' => true,
  'success_url' => 'https://example.com/success',
  'cancel_url' => 'https://example.com/cancel',
]);
```

```ruby
Stripe.api_key = '<<secret key>>'

Stripe::Checkout::Session.create({
  line_items: [
    {
      price_data: {
        unit_amount: 2000,
        product_data: {name: 'T-shirt'},
        currency: 'usd',
      },
      quantity: 1,
    },
  ],
  mode: 'payment',
  allow_promotion_codes: true,
  success_url: 'https://example.com/success',
  cancel_url: 'https://example.com/cancel',
})
```

## Configure a promotion code

For each promotion code, you can customize eligible customers, redemptions, and other limits.

### Limit by customer

To limit a promotion to a particular customer, specify a [customer](https://docs.stripe.com/api/promotion_codes/create.md#create_promotion_code-customer) when creating the promotion code. If no customer is specified, any customer can redeem the code.

### Limit by first-time order

You can also limit the promotion code to first-time customers with [restrictions.first_time_transaction](https://docs.stripe.com/api/promotion_codes/create.md#create_promotion_code-restrictions-first_time_transaction). If the `customer` isn’t defined, or if a defined `customer` has no prior payments or non-void *invoices*, it’s considered a first-time transaction.

Sessions that don’t create [Customers](https://docs.stripe.com/api/customers.md) instead create [Guest Customers](https://support.stripe.com/questions/guest-customer-faq) in the Dashboard. Promotion codes limited to first-time customers are still accepted for these Sessions.

### Set a minimum amount

With promotion codes, you can set a minimum transaction amount for eligible discount by configuring [minimum_amount](https://docs.stripe.com/api/promotion_codes/create.md#create_promotion_code-restrictions-minimum_amount) and [minimum_amount_currency](https://docs.stripe.com/api/promotion_codes/create.md#create_promotion_code-restrictions-minimum_amount_currency). Since promotion code restrictions are checked at redemption time, the minimum transaction amount only applies to the initial payment for a subscription.

### Customize expirations

You can set an expiration date on the promotion code using [expires_at](https://docs.stripe.com/api/promotion_codes/create.md#create_promotion_code-expires_at). If the underlying coupon already has `redeem_by` set, then the expiration date for the promotion code can’t be later than that of the coupon. If `promotion_code[expires_at]` isn’t specified, the coupon’s `redeem_by` automatically populates `expires_at`.

For example, you might have plans to support a coupon for a year, but you only want it to be redeemable for one week after a customer receives it. You can set `coupon[redeem_by]` to one year from now, and set each `promotion_code[expires_at]` to one week after it’s created.

### Limit redemptions

You can limit the number of redemptions by using [max_redemptions](https://docs.stripe.com/api/promotion_codes/create.md#create_promotion_code-max_redemptions), which works similarly to the coupon parameter. If the underlying coupon already has `max_redemptions` set, then the `max_redemptions` for the promotion code can’t be greater than that of the coupon.

For example, you might want a seasonal sale coupon to be redeemable by the first 50 customers, but the winter promotion can only use 20 of those redemptions. In this scenario, you can set `coupon[max_redemptions]: 50` and `promotion_code[max_redemptions]: 20`.

### Inactive promotions

You can set whether a promotion code is currently redeemable by using the [active](https://docs.stripe.com/api/promotion_codes/create.md#create_promotion_code-active) parameter. However, if the underlying coupon for a promotion code becomes invalid, all of its promotion codes become permanently inactive. Similarly, if a promotion code reaches its `max_redemptions` or `expires_at`, it becomes permanently inactive. You can’t reactivate these promotion codes.

### Delete promotions

You can delete promotions in the Dashboard or the API. Deleting a promotion prevents it from being applied to future transactions or customers.

# Embedded form

> This is a Embedded form for when payment-ui is embedded-form. View the original doc at https://docs.stripe.com/payments/checkout/discounts?payment-ui=embedded-form.

You can use discounts to reduce the amount charged to a customer. Coupons and promotion codes allow you to:

- Apply a discount to an entire purchase subtotal
- Apply a discount to specific products
- Reduce the total charged by a percentage or a flat amount
- Create customer-facing promotion codes on top of coupons to share directly with customers

To use coupons for discounting *subscriptions* with Checkout and Billing, see [Discounts for subscriptions](https://docs.stripe.com/billing/subscriptions/coupons.md).

## Create a coupon

Coupons specify a fixed value discount. You can create customer-facing promotion codes that map to a single underlying coupon. This means that the codes `FALLPROMO` and `SPRINGPROMO` can both point to one 25% off coupon. You can create coupons in the [Dashboard](https://dashboard.stripe.com/coupons) or with the [API](https://docs.stripe.com/api.md#coupons):

```dotnet
StripeConfiguration.ApiKey = "<<secret key>>";

var options = new CouponCreateOptions { PercentOff = 20M, Duration = "once" };
var service = new CouponService();
service.Create(options);
```

```go
stripe.Key = "<<secret key>>"

params := &stripe.CouponParams{
  PercentOff: stripe.Float64(20),
  Duration: stripe.String(string(stripe.CouponDurationOnce)),
};
result, err := coupon.New(params);
```

```java
Stripe.apiKey = "<<secret key>>";

CouponCreateParams params =
  CouponCreateParams.builder()
    .setPercentOff(new BigDecimal(20))
    .setDuration(CouponCreateParams.Duration.ONCE)
    .build();

Coupon coupon = Coupon.create(params);
```

```node
const stripe = require('stripe')('<<secret key>>');

const coupon = await stripe.coupons.create({
  percent_off: 20,
  duration: 'once',
});
```

```python
import stripe
stripe.api_key = "<<secret key>>"

stripe.Coupon.create(
  percent_off=20,
  duration="once",
)
```

```php
$stripe = new \Stripe\StripeClient('<<secret key>>');

$stripe->coupons->create([
  'percent_off' => 20,
  'duration' => 'once',
]);
```

```ruby
Stripe.api_key = '<<secret key>>'

Stripe::Coupon.create({
  percent_off: 20,
  duration: 'once',
})
```

## Use a coupon

To create a session with an applied discount, pass the [coupon ID](https://docs.stripe.com/api/coupons/object.md#coupon_object-id) in the `coupon` parameter of the [discounts](https://docs.stripe.com/api/checkout/sessions/create.md#create_checkout_session-discounts) array. Checkout currently supports up to one coupon or promotion code.

```dotnet
StripeConfiguration.ApiKey = "<<secret key>>";

var options = new Stripe.Checkout.SessionCreateOptions
{
    LineItems = new List<Stripe.Checkout.SessionLineItemOptions>
    {
        new Stripe.Checkout.SessionLineItemOptions { Price = "<<price>>", Quantity = 1 },
    },
    Discounts = new List<Stripe.Checkout.SessionDiscountOptions>
    {
        new Stripe.Checkout.SessionDiscountOptions { Coupon = "<<coupon>>" },
    },
    Mode = "payment",
    UiMode = "embedded",
    ReturnUrl = "https://example.com/checkout/return?session_id={CHECKOUT_SESSION_ID}",
};
var service = new Stripe.Checkout.SessionService();
service.Create(options);
```

```go
stripe.Key = "<<secret key>>"

params := &stripe.CheckoutSessionParams{
  LineItems: []*stripe.CheckoutSessionLineItemParams{
    &stripe.CheckoutSessionLineItemParams{
      Price: stripe.String("<<price>>"),
      Quantity: stripe.Int64(1),
    },
  },
  Discounts: []*stripe.CheckoutSessionDiscountParams{
    &stripe.CheckoutSessionDiscountParams{Coupon: stripe.String("<<coupon>>")},
  },
  Mode: stripe.String(string(stripe.CheckoutSessionModePayment)),
  UIMode: stripe.String(string(stripe.CheckoutSessionUIModeEmbedded)),
  ReturnURL: stripe.String("https://example.com/checkout/return?session_id={CHECKOUT_SESSION_ID}"),
};
result, err := session.New(params);
```

```java
Stripe.apiKey = "<<secret key>>";

SessionCreateParams params =
  SessionCreateParams.builder()
    .addLineItem(
      SessionCreateParams.LineItem.builder().setPrice("<<price>>").setQuantity(1L).build()
    )
    .addDiscount(SessionCreateParams.Discount.builder().setCoupon("<<coupon>>").build())
    .setMode(SessionCreateParams.Mode.PAYMENT)
    .setUiMode(SessionCreateParams.UiMode.EMBEDDED)
    .setReturnUrl("https://example.com/checkout/return?session_id={CHECKOUT_SESSION_ID}")
    .build();

Session session = Session.create(params);
```

```node
const stripe = require('stripe')('<<secret key>>');

const session = await stripe.checkout.sessions.create({
  line_items: [
    {
      price: '<<price>>',
      quantity: 1,
    },
  ],
  discounts: [
    {
      coupon: '<<coupon>>',
    },
  ],
  mode: 'payment',
  ui_mode: 'embedded',
  return_url: 'https://example.com/checkout/return?session_id={CHECKOUT_SESSION_ID}',
});
```

```python
import stripe
stripe.api_key = "<<secret key>>"

stripe.checkout.Session.create(
  line_items=[{"price": "<<price>>", "quantity": 1}],
  discounts=[{"coupon": "<<coupon>>"}],
  mode="payment",
  ui_mode="embedded",
  return_url="https://example.com/checkout/return?session_id={CHECKOUT_SESSION_ID}",
)
```

```php
$stripe = new \Stripe\StripeClient('<<secret key>>');

$stripe->checkout->sessions->create([
  'line_items' => [
    [
      'price' => '<<price>>',
      'quantity' => 1,
    ],
  ],
  'discounts' => [['coupon' => '<<coupon>>']],
  'mode' => 'payment',
  'ui_mode' => 'embedded',
  'return_url' => 'https://example.com/checkout/return?session_id={CHECKOUT_SESSION_ID}',
]);
```

```ruby
Stripe.api_key = '<<secret key>>'

Stripe::Checkout::Session.create({
  line_items: [
    {
      price: '<<price>>',
      quantity: 1,
    },
  ],
  discounts: [{coupon: '<<coupon>>'}],
  mode: 'payment',
  ui_mode: 'embedded',
  return_url: 'https://example.com/checkout/return?session_id={CHECKOUT_SESSION_ID}',
})
```

## Configure a coupon

Coupons have the following parameters that you can use:

* `currency`
* `percent_off` or `amount_off`
* `max_redemptions`
* `redeem_by`, the latest date customers can apply the coupon
* `applies_to`, limits the products that the coupon applies to

The coupon object adds discounts to both one-time payments and subscriptions. Some coupon object parameters, like `duration`, only apply to [subscriptions](https://docs.stripe.com/billing/subscriptions/coupons.md).

### Limit redemption usage

The `max_redemptions` and `redeem_by` values apply to the coupon across every application. For example, you can restrict a coupon to the first 50 usages of it, or you can make a coupon expire by a certain date.

### Limit eligible products

You can limit the products that are eligible for discounts using a coupon by adding the product IDs to the `applies_to` hash in the Coupon object. Any promotion codes that map to this coupon only apply to the list of eligible products.

### Delete a coupon

You can delete coupons in the Dashboard or the API. Deleting a coupon prevents it from being applied to future transactions or customers.

## Create a promotion code

Promotion codes are customer-facing codes created on top of coupons. You can also specify additional restrictions that control when a customer can apply the promotion. You can share these codes with customers who can enter them during checkout to apply a discount.

To create a [promotion code](https://docs.stripe.com/api/promotion_codes.md), specify an existing `coupon` and any restrictions (for example, limiting it to a specific `customer`). If you have a specific code to give to your customer (for example, `FALL25OFF`), set the `code`. If you leave this field blank, we’ll generate a random `code` for you.

The `code` is case-insensitive and unique across active promotion codes for any customer. For example:

* You can create multiple customer-restricted promotion codes with the same `code`, but you can’t reuse that `code` for a promotion code redeemable by any customer.
* If you create a promotion code that is redeemable by any customer, you can’t create another active promotion code with the same `code`.
* You can create a promotion code with `code: NEWUSER`, inactivate it by passing `active: false`, and then create a new promotion code with `code: NEWUSER`.

Promotion codes can be created in the coupons section of the [Dashboard](https://dashboard.stripe.com/coupons/create) or with the [API](https://docs.stripe.com/api.md#promotion_codes):

```dotnet
StripeConfiguration.ApiKey = "<<secret key>>";

var options = new PromotionCodeCreateOptions { Coupon = "{{COUPON_ID}}", Code = "VIPCODE" };
var service = new PromotionCodeService();
service.Create(options);
```

```go
stripe.Key = "<<secret key>>"

params := &stripe.PromotionCodeParams{
  Coupon: stripe.String("{{COUPON_ID}}"),
  Code: stripe.String("VIPCODE"),
};
result, err := promotioncode.New(params);
```

```java
Stripe.apiKey = "<<secret key>>";

PromotionCodeCreateParams params =
  PromotionCodeCreateParams.builder().setCoupon("{{COUPON_ID}}").setCode("VIPCODE").build();

PromotionCode promotionCode = PromotionCode.create(params);
```

```node
const stripe = require('stripe')('<<secret key>>');

const promotionCode = await stripe.promotionCodes.create({
  coupon: '{{COUPON_ID}}',
  code: 'VIPCODE',
});
```

```python
import stripe
stripe.api_key = "<<secret key>>"

stripe.PromotionCode.create(
  coupon="{{COUPON_ID}}",
  code="VIPCODE",
)
```

```php
$stripe = new \Stripe\StripeClient('<<secret key>>');

$stripe->promotionCodes->create([
  'coupon' => '{{COUPON_ID}}',
  'code' => 'VIPCODE',
]);
```

```ruby
Stripe.api_key = '<<secret key>>'

Stripe::PromotionCode.create({
  coupon: '{{COUPON_ID}}',
  code: 'VIPCODE',
})
```

## Use a promotion code 

Enable customer-redeemable promotion codes using the [allow_promotion_codes](https://docs.stripe.com/api/checkout/sessions/object.md#checkout_session_object-allow_promotion_codes) parameter in a Checkout Session. This enables a field in Checkout to allow customers to input promotion codes.

```dotnet
StripeConfiguration.ApiKey = "<<secret key>>";

var options = new Stripe.Checkout.SessionCreateOptions
{
    LineItems = new List<Stripe.Checkout.SessionLineItemOptions>
    {
        new Stripe.Checkout.SessionLineItemOptions
        {
            PriceData = new Stripe.Checkout.SessionLineItemPriceDataOptions
            {
                UnitAmount = 2000,
                ProductData = new Stripe.Checkout.SessionLineItemPriceDataProductDataOptions
                {
                    Name = "T-shirt",
                },
                Currency = "usd",
            },
            Quantity = 1,
        },
    },
    Mode = "payment",
    UiMode = "embedded",
    AllowPromotionCodes = true,
    ReturnUrl = "https://example.com/checkout/return?session_id={CHECKOUT_SESSION_ID}",
};
var service = new Stripe.Checkout.SessionService();
service.Create(options);
```

```go
stripe.Key = "<<secret key>>"

params := &stripe.CheckoutSessionParams{
  LineItems: []*stripe.CheckoutSessionLineItemParams{
    &stripe.CheckoutSessionLineItemParams{
      PriceData: &stripe.CheckoutSessionLineItemPriceDataParams{
        UnitAmount: stripe.Int64(2000),
        ProductData: &stripe.CheckoutSessionLineItemPriceDataProductDataParams{
          Name: stripe.String("T-shirt"),
        },
        Currency: stripe.String(string(stripe.CurrencyUSD)),
      },
      Quantity: stripe.Int64(1),
    },
  },
  Mode: stripe.String(string(stripe.CheckoutSessionModePayment)),
  UIMode: stripe.String(string(stripe.CheckoutSessionUIModeEmbedded)),
  AllowPromotionCodes: stripe.Bool(true),
  ReturnURL: stripe.String("https://example.com/checkout/return?session_id={CHECKOUT_SESSION_ID}"),
};
result, err := session.New(params);
```

```java
Stripe.apiKey = "<<secret key>>";

SessionCreateParams params =
  SessionCreateParams.builder()
    .addLineItem(
      SessionCreateParams.LineItem.builder()
        .setPriceData(
          SessionCreateParams.LineItem.PriceData.builder()
            .setUnitAmount(2000L)
            .setProductData(
              SessionCreateParams.LineItem.PriceData.ProductData.builder()
                .setName("T-shirt")
                .build()
            )
            .setCurrency("usd")
            .build()
        )
        .setQuantity(1L)
        .build()
    )
    .setMode(SessionCreateParams.Mode.PAYMENT)
    .setUiMode(SessionCreateParams.UiMode.EMBEDDED)
    .setAllowPromotionCodes(true)
    .setReturnUrl("https://example.com/checkout/return?session_id={CHECKOUT_SESSION_ID}")
    .build();

Session session = Session.create(params);
```

```node
const stripe = require('stripe')('<<secret key>>');

const session = await stripe.checkout.sessions.create({
  line_items: [
    {
      price_data: {
        unit_amount: 2000,
        product_data: {
          name: 'T-shirt',
        },
        currency: 'usd',
      },
      quantity: 1,
    },
  ],
  mode: 'payment',
  ui_mode: 'embedded',
  allow_promotion_codes: true,
  return_url: 'https://example.com/checkout/return?session_id={CHECKOUT_SESSION_ID}',
});
```

```python
import stripe
stripe.api_key = "<<secret key>>"

stripe.checkout.Session.create(
  line_items=[
    {
      "price_data": {"unit_amount": 2000, "product_data": {"name": "T-shirt"}, "currency": "usd"},
      "quantity": 1,
    },
  ],
  mode="payment",
  ui_mode="embedded",
  allow_promotion_codes=True,
  return_url="https://example.com/checkout/return?session_id={CHECKOUT_SESSION_ID}",
)
```

```php
$stripe = new \Stripe\StripeClient('<<secret key>>');

$stripe->checkout->sessions->create([
  'line_items' => [
    [
      'price_data' => [
        'unit_amount' => 2000,
        'product_data' => ['name' => 'T-shirt'],
        'currency' => 'usd',
      ],
      'quantity' => 1,
    ],
  ],
  'mode' => 'payment',
  'ui_mode' => 'embedded',
  'allow_promotion_codes' => true,
  'return_url' => 'https://example.com/checkout/return?session_id={CHECKOUT_SESSION_ID}',
]);
```

```ruby
Stripe.api_key = '<<secret key>>'

Stripe::Checkout::Session.create({
  line_items: [
    {
      price_data: {
        unit_amount: 2000,
        product_data: {name: 'T-shirt'},
        currency: 'usd',
      },
      quantity: 1,
    },
  ],
  mode: 'payment',
  ui_mode: 'embedded',
  allow_promotion_codes: true,
  return_url: 'https://example.com/checkout/return?session_id={CHECKOUT_SESSION_ID}',
})
```

## Configure a promotion code

For each promotion code, you can customize eligible customers, redemptions, and other limits.

### Limit by customer

To limit a promotion to a particular customer, specify a [customer](https://docs.stripe.com/api/promotion_codes/create.md#create_promotion_code-customer) when creating the promotion code. If no customer is specified, any customer can redeem the code.

### Limit by first-time order

You can also limit the promotion code to first-time customers with [restrictions.first_time_transaction](https://docs.stripe.com/api/promotion_codes/create.md#create_promotion_code-restrictions-first_time_transaction). If the `customer` isn’t defined, or if a defined `customer` has no prior payments or non-void *invoices*, it’s considered a first-time transaction.

Sessions that don’t create [Customers](https://docs.stripe.com/api/customers.md) instead create [Guest Customers](https://support.stripe.com/questions/guest-customer-faq) in the Dashboard. Promotion codes limited to first-time customers are still accepted for these Sessions.

### Set a minimum amount

With promotion codes, you can set a minimum transaction amount for eligible discount by configuring [minimum_amount](https://docs.stripe.com/api/promotion_codes/create.md#create_promotion_code-restrictions-minimum_amount) and [minimum_amount_currency](https://docs.stripe.com/api/promotion_codes/create.md#create_promotion_code-restrictions-minimum_amount_currency). Since promotion code restrictions are checked at redemption time, the minimum transaction amount only applies to the initial payment for a subscription.

### Customize expirations

You can set an expiration date on the promotion code using [expires_at](https://docs.stripe.com/api/promotion_codes/create.md#create_promotion_code-expires_at). If the underlying coupon already has `redeem_by` set, then the expiration date for the promotion code can’t be later than that of the coupon. If `promotion_code[expires_at]` isn’t specified, the coupon’s `redeem_by` automatically populates `expires_at`.

For example, you might have plans to support a coupon for a year, but you only want it to be redeemable for one week after a customer receives it. You can set `coupon[redeem_by]` to one year from now, and set each `promotion_code[expires_at]` to one week after it’s created.

### Limit redemptions

You can limit the number of redemptions by using [max_redemptions](https://docs.stripe.com/api/promotion_codes/create.md#create_promotion_code-max_redemptions), which works similarly to the coupon parameter. If the underlying coupon already has `max_redemptions` set, then the `max_redemptions` for the promotion code can’t be greater than that of the coupon.

For example, you might want a seasonal sale coupon to be redeemable by the first 50 customers, but the winter promotion can only use 20 of those redemptions. In this scenario, you can set `coupon[max_redemptions]: 50` and `promotion_code[max_redemptions]: 20`.

### Inactive promotions

You can set whether a promotion code is currently redeemable by using the [active](https://docs.stripe.com/api/promotion_codes/create.md#create_promotion_code-active) parameter. However, if the underlying coupon for a promotion code becomes invalid, all of its promotion codes become permanently inactive. Similarly, if a promotion code reaches its `max_redemptions` or `expires_at`, it becomes permanently inactive. You can’t reactivate these promotion codes.

### Delete promotions

You can delete promotions in the Dashboard or the API. Deleting a promotion prevents it from being applied to future transactions or customers.

# Embedded components

> This is a Embedded components for when payment-ui is embedded-components. View the original doc at https://docs.stripe.com/payments/checkout/discounts?payment-ui=embedded-components.

You can use discounts to reduce the amount charged to a customer. Coupons and promotion codes allow you to:

- Apply a discount to an entire purchase subtotal
- Apply a discount to specific products
- Reduce the total charged by a percentage or a flat amount
- Create customer-facing promotion codes on top of coupons to share directly with customers

## Create a coupon

Coupons specify a fixed value discount. You can create customer-facing promotion codes that map to a single underlying coupon. This means that the codes `FALLPROMO` and `SPRINGPROMO` can both point to one 25% off coupon. You can create coupons in the [Dashboard](https://dashboard.stripe.com/coupons) or with the [API](https://docs.stripe.com/api.md#coupons):

```dotnet
StripeConfiguration.ApiKey = "<<secret key>>";

var options = new CouponCreateOptions { PercentOff = 20M, Duration = "once" };
var service = new CouponService();
service.Create(options);
```

```go
stripe.Key = "<<secret key>>"

params := &stripe.CouponParams{
  PercentOff: stripe.Float64(20),
  Duration: stripe.String(string(stripe.CouponDurationOnce)),
};
result, err := coupon.New(params);
```

```java
Stripe.apiKey = "<<secret key>>";

CouponCreateParams params =
  CouponCreateParams.builder()
    .setPercentOff(new BigDecimal(20))
    .setDuration(CouponCreateParams.Duration.ONCE)
    .build();

Coupon coupon = Coupon.create(params);
```

```node
const stripe = require('stripe')('<<secret key>>');

const coupon = await stripe.coupons.create({
  percent_off: 20,
  duration: 'once',
});
```

```python
import stripe
stripe.api_key = "<<secret key>>"

stripe.Coupon.create(
  percent_off=20,
  duration="once",
)
```

```php
$stripe = new \Stripe\StripeClient('<<secret key>>');

$stripe->coupons->create([
  'percent_off' => 20,
  'duration' => 'once',
]);
```

```ruby
Stripe.api_key = '<<secret key>>'

Stripe::Coupon.create({
  percent_off: 20,
  duration: 'once',
})
```

## Use a coupon

To create a session with an applied discount, pass the [coupon ID](https://docs.stripe.com/api/coupons/object.md#coupon_object-id) in the `coupon` parameter of the [discounts](https://docs.stripe.com/api/checkout/sessions/create.md#create_checkout_session-discounts) array. Checkout Sessions supports up to one coupon or promotion code.

```dotnet
StripeConfiguration.ApiKey = "<<secret key>>";

var options = new Stripe.Checkout.SessionCreateOptions
{
    LineItems = new List<Stripe.Checkout.SessionLineItemOptions>
    {
        new Stripe.Checkout.SessionLineItemOptions { Price = "<<price>>", Quantity = 1 },
    },
    Discounts = new List<Stripe.Checkout.SessionDiscountOptions>
    {
        new Stripe.Checkout.SessionDiscountOptions { Coupon = "<<coupon>>" },
    },
    Mode = "payment",
    UiMode = "custom",
    ReturnUrl = "https://example.com/checkout/return",
};
var service = new Stripe.Checkout.SessionService();
service.Create(options);
```

```go
stripe.Key = "<<secret key>>"

params := &stripe.CheckoutSessionParams{
  LineItems: []*stripe.CheckoutSessionLineItemParams{
    &stripe.CheckoutSessionLineItemParams{
      Price: stripe.String("<<price>>"),
      Quantity: stripe.Int64(1),
    },
  },
  Discounts: []*stripe.CheckoutSessionDiscountParams{
    &stripe.CheckoutSessionDiscountParams{Coupon: stripe.String("<<coupon>>")},
  },
  Mode: stripe.String(string(stripe.CheckoutSessionModePayment)),
  UIMode: stripe.String(string(stripe.CheckoutSessionUIModeCustom)),
  ReturnURL: stripe.String("https://example.com/checkout/return"),
};
result, err := session.New(params);
```

```java
Stripe.apiKey = "<<secret key>>";

SessionCreateParams params =
  SessionCreateParams.builder()
    .addLineItem(
      SessionCreateParams.LineItem.builder().setPrice("<<price>>").setQuantity(1L).build()
    )
    .addDiscount(SessionCreateParams.Discount.builder().setCoupon("<<coupon>>").build())
    .setMode(SessionCreateParams.Mode.PAYMENT)
    .setUiMode(SessionCreateParams.UiMode.CUSTOM)
    .setReturnUrl("https://example.com/checkout/return")
    .build();

Session session = Session.create(params);
```

```node
const stripe = require('stripe')('<<secret key>>');

const session = await stripe.checkout.sessions.create({
  line_items: [
    {
      price: '<<price>>',
      quantity: 1,
    },
  ],
  discounts: [
    {
      coupon: '<<coupon>>',
    },
  ],
  mode: 'payment',
  ui_mode: 'custom',
  return_url: 'https://example.com/checkout/return',
});
```

```python
import stripe
stripe.api_key = "<<secret key>>"

stripe.checkout.Session.create(
  line_items=[{"price": "<<price>>", "quantity": 1}],
  discounts=[{"coupon": "<<coupon>>"}],
  mode="payment",
  ui_mode="custom",
  return_url="https://example.com/checkout/return",
)
```

```php
$stripe = new \Stripe\StripeClient('<<secret key>>');

$stripe->checkout->sessions->create([
  'line_items' => [
    [
      'price' => '<<price>>',
      'quantity' => 1,
    ],
  ],
  'discounts' => [['coupon' => '<<coupon>>']],
  'mode' => 'payment',
  'ui_mode' => 'custom',
  'return_url' => 'https://example.com/checkout/return',
]);
```

```ruby
Stripe.api_key = '<<secret key>>'

Stripe::Checkout::Session.create({
  line_items: [
    {
      price: '<<price>>',
      quantity: 1,
    },
  ],
  discounts: [{coupon: '<<coupon>>'}],
  mode: 'payment',
  ui_mode: 'custom',
  return_url: 'https://example.com/checkout/return',
})
```

## Configure a coupon

Coupons have the following parameters that you can use:

- `currency`
- `percent_off` or `amount_off`
- `max_redemptions`
- `redeem_by`, the latest date customers can apply the coupon
- `applies_to`, limits the products that the coupon applies to

### Limit redemption usage

The `max_redemptions` and `redeem_by` values apply to the coupon across every application. For example, you can restrict a coupon to the first 50 usages of it, or you can make a coupon expire by a certain date.

### Limit eligible products

You can limit the products that are eligible for discounts using a coupon by adding the product IDs to the `applies_to` hash in the Coupon object. Any promotion codes that map to this coupon only apply to the list of eligible products.

### Delete a coupon

You can delete coupons in the Dashboard or the API. Deleting a coupon prevents it from being applied to future transactions or customers.

## Create a promotion code

Promotion codes are customer-facing codes created on top of coupons. You can also specify additional restrictions that control when a customer can apply the promotion. You can share these codes with customers who can enter them during checkout to apply a discount.

To create a [promotion code](https://docs.stripe.com/api/promotion_codes.md), specify an existing `coupon` and any restrictions (for example, limiting it to a specific `customer`). If you have a specific code to give to your customer (for example, `FALL25OFF`), set the `code`. If you leave this field blank, we’ll generate a random `code` for you.

The `code` is case-insensitive and unique across active promotion codes for any customer. For example:

* You can create multiple customer-restricted promotion codes with the same `code`, but you can’t reuse that `code` for a promotion code redeemable by any customer.
* If you create a promotion code that is redeemable by any customer, you can’t create another active promotion code with the same `code`.
* You can create a promotion code with `code: NEWUSER`, inactivate it by passing `active: false`, and then create a new promotion code with `code: NEWUSER`.

Promotion codes can be created in the coupons section of the [Dashboard](https://dashboard.stripe.com/coupons/create) or with the [API](https://docs.stripe.com/api.md#promotion_codes):

```dotnet
StripeConfiguration.ApiKey = "<<secret key>>";

var options = new PromotionCodeCreateOptions { Coupon = "{{COUPON_ID}}", Code = "VIPCODE" };
var service = new PromotionCodeService();
service.Create(options);
```

```go
stripe.Key = "<<secret key>>"

params := &stripe.PromotionCodeParams{
  Coupon: stripe.String("{{COUPON_ID}}"),
  Code: stripe.String("VIPCODE"),
};
result, err := promotioncode.New(params);
```

```java
Stripe.apiKey = "<<secret key>>";

PromotionCodeCreateParams params =
  PromotionCodeCreateParams.builder().setCoupon("{{COUPON_ID}}").setCode("VIPCODE").build();

PromotionCode promotionCode = PromotionCode.create(params);
```

```node
const stripe = require('stripe')('<<secret key>>');

const promotionCode = await stripe.promotionCodes.create({
  coupon: '{{COUPON_ID}}',
  code: 'VIPCODE',
});
```

```python
import stripe
stripe.api_key = "<<secret key>>"

stripe.PromotionCode.create(
  coupon="{{COUPON_ID}}",
  code="VIPCODE",
)
```

```php
$stripe = new \Stripe\StripeClient('<<secret key>>');

$stripe->promotionCodes->create([
  'coupon' => '{{COUPON_ID}}',
  'code' => 'VIPCODE',
]);
```

```ruby
Stripe.api_key = '<<secret key>>'

Stripe::PromotionCode.create({
  coupon: '{{COUPON_ID}}',
  code: 'VIPCODE',
})
```

## Use a promotion code 

On your server, enable customer-redeemable promotion codes using the [allow_promotion_codes](https://docs.stripe.com/api/checkout/sessions/object.md#checkout_session_object-allow_promotion_codes) parameter in a Checkout Session.

```dotnet
StripeConfiguration.ApiKey = "<<secret key>>";

var options = new Stripe.Checkout.SessionCreateOptions
{
    LineItems = new List<Stripe.Checkout.SessionLineItemOptions>
    {
        new Stripe.Checkout.SessionLineItemOptions
        {
            PriceData = new Stripe.Checkout.SessionLineItemPriceDataOptions
            {
                UnitAmount = 2000,
                ProductData = new Stripe.Checkout.SessionLineItemPriceDataProductDataOptions
                {
                    Name = "T-shirt",
                },
                Currency = "usd",
            },
            Quantity = 1,
        },
    },
    Mode = "payment",
    UiMode = "custom",
    AllowPromotionCodes = true,
    ReturnUrl = "https://example.com/checkout/return",
};
var service = new Stripe.Checkout.SessionService();
service.Create(options);
```

```go
stripe.Key = "<<secret key>>"

params := &stripe.CheckoutSessionParams{
  LineItems: []*stripe.CheckoutSessionLineItemParams{
    &stripe.CheckoutSessionLineItemParams{
      PriceData: &stripe.CheckoutSessionLineItemPriceDataParams{
        UnitAmount: stripe.Int64(2000),
        ProductData: &stripe.CheckoutSessionLineItemPriceDataProductDataParams{
          Name: stripe.String("T-shirt"),
        },
        Currency: stripe.String(string(stripe.CurrencyUSD)),
      },
      Quantity: stripe.Int64(1),
    },
  },
  Mode: stripe.String(string(stripe.CheckoutSessionModePayment)),
  UIMode: stripe.String(string(stripe.CheckoutSessionUIModeCustom)),
  AllowPromotionCodes: stripe.Bool(true),
  ReturnURL: stripe.String("https://example.com/checkout/return"),
};
result, err := session.New(params);
```

```java
Stripe.apiKey = "<<secret key>>";

SessionCreateParams params =
  SessionCreateParams.builder()
    .addLineItem(
      SessionCreateParams.LineItem.builder()
        .setPriceData(
          SessionCreateParams.LineItem.PriceData.builder()
            .setUnitAmount(2000L)
            .setProductData(
              SessionCreateParams.LineItem.PriceData.ProductData.builder()
                .setName("T-shirt")
                .build()
            )
            .setCurrency("usd")
            .build()
        )
        .setQuantity(1L)
        .build()
    )
    .setMode(SessionCreateParams.Mode.PAYMENT)
    .setUiMode(SessionCreateParams.UiMode.CUSTOM)
    .setAllowPromotionCodes(true)
    .setReturnUrl("https://example.com/checkout/return")
    .build();

Session session = Session.create(params);
```

```node
const stripe = require('stripe')('<<secret key>>');

const session = await stripe.checkout.sessions.create({
  line_items: [
    {
      price_data: {
        unit_amount: 2000,
        product_data: {
          name: 'T-shirt',
        },
        currency: 'usd',
      },
      quantity: 1,
    },
  ],
  mode: 'payment',
  ui_mode: 'custom',
  allow_promotion_codes: true,
  return_url: 'https://example.com/checkout/return',
});
```

```python
import stripe
stripe.api_key = "<<secret key>>"

stripe.checkout.Session.create(
  line_items=[
    {
      "price_data": {"unit_amount": 2000, "product_data": {"name": "T-shirt"}, "currency": "usd"},
      "quantity": 1,
    },
  ],
  mode="payment",
  ui_mode="custom",
  allow_promotion_codes=True,
  return_url="https://example.com/checkout/return",
)
```

```php
$stripe = new \Stripe\StripeClient('<<secret key>>');

$stripe->checkout->sessions->create([
  'line_items' => [
    [
      'price_data' => [
        'unit_amount' => 2000,
        'product_data' => ['name' => 'T-shirt'],
        'currency' => 'usd',
      ],
      'quantity' => 1,
    ],
  ],
  'mode' => 'payment',
  'ui_mode' => 'custom',
  'allow_promotion_codes' => true,
  'return_url' => 'https://example.com/checkout/return',
]);
```

```ruby
Stripe.api_key = '<<secret key>>'

Stripe::Checkout::Session.create({
  line_items: [
    {
      price_data: {
        unit_amount: 2000,
        product_data: {name: 'T-shirt'},
        currency: 'usd',
      },
      quantity: 1,
    },
  ],
  mode: 'payment',
  ui_mode: 'custom',
  allow_promotion_codes: true,
  return_url: 'https://example.com/checkout/return',
})
```

On your client, use [applyPromotionCode](https://docs.stripe.com/js/custom_checkout/apply_promotion_code) to apply a promotion code that your customer enters. Use [removePromotionCode](https://docs.stripe.com/js/custom_checkout/remove_promotion_code) to remove all previously applied promotion codes.

```html
<input type="text" id="promotion-code" />
<button id="apply-promotion-code">Apply</button>
<button id="remove-promotion-codes">Remove</button>
<div id="promotion-code-error"></div>
```

```js
stripe.initCheckout({fetchClientSecret}).then((checkout) => {
  const input = document.getElementById('promotion-code');
  document.getElementById('apply-promotion-code').addEventListener('click', () => {
    checkout.applyPromotionCode(input.value).then((result) => {
      if (result.error) {
        // Display an error message
        document.getElementById('promotion-code-error').textContent = result.error.message;
      } else {
        // Clear the input if the promotion code was successfully applied
        input.value = '';
      }
    });
  });
  document.getElementById('remove-promotion-codes').addEventListener('click', () => {
    checkout.removePromotionCode();
  });
});
```

```jsx
import React from 'react';
import {useCheckout} from '@stripe/react-stripe-js';

const PromotionCode = () => {
  const {applyPromotionCode, removePromotionCode} = useCheckout();
  const [draft, setDraft] = React.useState('');
  const [loading, setLoading] = React.useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setDraft(e.target.value);
  };
  const handleSubmit = () => {
    setLoading(true);
    applyPromotionCode(draft).finally(() => {
      setDraft('');
      setLoading(false);
    });
  };
  const handleRemove = () => {
    removePromotionCode();
  };

  return (
    <div>
      <input type="text" value={draft} onChange={handleChange} />
      <button disabled={loading} onClick={handleSubmit}>
        Apply
      </button>
      <button onClick={handleRemove}>Remove</button>
    </div>
  );
};

export default PromotionCode;
```

## Configure a promotion code

For each promotion code, you can customize eligible customers, redemptions, and other limits.

### Limit by customer

To limit a promotion to a particular customer, specify a [customer](https://docs.stripe.com/api/promotion_codes/create.md#create_promotion_code-customer) when creating the promotion code. If no customer is specified, any customer can redeem the code.

### Limit by first-time order

You can also limit the promotion code to first-time customers with [restrictions.first_time_transaction](https://docs.stripe.com/api/promotion_codes/create.md#create_promotion_code-restrictions-first_time_transaction). If the `customer` isn’t defined, or if a defined `customer` has no prior payments or non-void *invoices*, it’s considered a first-time transaction.

Sessions that don’t create [Customers](https://docs.stripe.com/api/customers.md) instead create [Guest Customers](https://support.stripe.com/questions/guest-customer-faq) in the Dashboard. Promotion codes limited to first-time customers are still accepted for these Sessions.

### Set a minimum amount

With promotion codes, you can set a minimum transaction amount for eligible discount by configuring [minimum_amount](https://docs.stripe.com/api/promotion_codes/create.md#create_promotion_code-restrictions-minimum_amount) and [minimum_amount_currency](https://docs.stripe.com/api/promotion_codes/create.md#create_promotion_code-restrictions-minimum_amount_currency). Since promotion code restrictions are checked at redemption time, the minimum transaction amount only applies to the initial payment for a subscription.

### Customize expirations

You can set an expiration date on the promotion code using [expires_at](https://docs.stripe.com/api/promotion_codes/create.md#create_promotion_code-expires_at). If the underlying coupon already has `redeem_by` set, then the expiration date for the promotion code can’t be later than that of the coupon. If `promotion_code[expires_at]` isn’t specified, the coupon’s `redeem_by` automatically populates `expires_at`.

For example, you might have plans to support a coupon for a year, but you only want it to be redeemable for one week after a customer receives it. You can set `coupon[redeem_by]` to one year from now, and set each `promotion_code[expires_at]` to one week after it’s created.

### Limit redemptions

You can limit the number of redemptions by using [max_redemptions](https://docs.stripe.com/api/promotion_codes/create.md#create_promotion_code-max_redemptions), which works similarly to the coupon parameter. If the underlying coupon already has `max_redemptions` set, then the `max_redemptions` for the promotion code can’t be greater than that of the coupon.

For example, you might want a seasonal sale coupon to be redeemable by the first 50 customers, but the winter promotion can only use 20 of those redemptions. In this scenario, you can set `coupon[max_redemptions]: 50` and `promotion_code[max_redemptions]: 20`.

### Inactive promotions

You can set whether a promotion code is currently redeemable by using the [active](https://docs.stripe.com/api/promotion_codes/create.md#create_promotion_code-active) parameter. However, if the underlying coupon for a promotion code becomes invalid, all of its promotion codes become permanently inactive. Similarly, if a promotion code reaches its `max_redemptions` or `expires_at`, it becomes permanently inactive. You can’t reactivate these promotion codes.

### Delete promotions

You can delete promotions in the Dashboard or the API. Deleting a promotion prevents it from being applied to future transactions or customers.
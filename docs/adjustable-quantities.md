---
title: Make line item quantities adjustable
subtitle: Enable your customers to adjust the quantity of items during checkout.
route: /payments/checkout/adjustable-quantity
---

# Make line item quantities adjustable

Enable your customers to adjust the quantity of items during checkout.

# Stripe-hosted page

> This is a Stripe-hosted page for when payment-ui is stripe-hosted. View the original doc at https://docs.stripe.com/payments/checkout/adjustable-quantity?payment-ui=stripe-hosted.

The line items for each [Checkout Session](https://docs.stripe.com/api/checkout/sessions.md) keep track of what your customer is purchasing. You can configure the Checkout Session so customers can adjust line item quantities during checkout.

## Create a Checkout Session with an adjustable quantity 

Set `adjustable_quantity` on your `line_items` when creating a Checkout Session to enable your customers to update the quantity of an item during checkout.

You can customize the default settings for the minimum and maximum quantities allowed by setting `adjustable_quantity.minimum` and `adjustable_quantity.maximum`. By default, an item’s minimum adjustable quantity is `0` and the maximum adjustable quantity is `99`. You can specify a value of up to `999999` for `adjustable_quantity.maximum`.

When using adjustable quantities with a `line_items[].quantity` value greater than `99` (the default adjustable maximum), set `adjustable_quantity.maximum` to be greater than or equal to that item’s quantity.

If you use adjustable quantities, change your configuration so that it uses `adjustable_quantity.maximum` when creating the Checkout Session to reserve inventory quantity instead of the `line_items` quantity.

Checkout prevents the customer from removing an item if it is the only item remaining.

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
                Currency = "usd",
                ProductData = new Stripe.Checkout.SessionLineItemPriceDataProductDataOptions
                {
                    Name = "T-shirt",
                },
                UnitAmount = 2000,
                TaxBehavior = "exclusive",
            },
            AdjustableQuantity = new Stripe.Checkout.SessionLineItemAdjustableQuantityOptions
            {
                Enabled = true,
                Minimum = 1,
                Maximum = 10,
            },
            Quantity = 1,
        },
    },
    AutomaticTax = new Stripe.Checkout.SessionAutomaticTaxOptions { Enabled = true },
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
      PriceData: &stripe.CheckoutSessionLineItemPriceDataParams{
        Currency: stripe.String(string(stripe.CurrencyUSD)),
        ProductData: &stripe.CheckoutSessionLineItemPriceDataProductDataParams{
          Name: stripe.String("T-shirt"),
        },
        UnitAmount: stripe.Int64(2000),
        TaxBehavior: stripe.String("exclusive"),
      },
      AdjustableQuantity: &stripe.CheckoutSessionLineItemAdjustableQuantityParams{
        Enabled: stripe.Bool(true),
        Minimum: stripe.Int64(1),
        Maximum: stripe.Int64(10),
      },
      Quantity: stripe.Int64(1),
    },
  },
  AutomaticTax: &stripe.CheckoutSessionAutomaticTaxParams{Enabled: stripe.Bool(true)},
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
      SessionCreateParams.LineItem.builder()
        .setPriceData(
          SessionCreateParams.LineItem.PriceData.builder()
            .setCurrency("usd")
            .setProductData(
              SessionCreateParams.LineItem.PriceData.ProductData.builder()
                .setName("T-shirt")
                .build()
            )
            .setUnitAmount(2000L)
            .setTaxBehavior(SessionCreateParams.LineItem.PriceData.TaxBehavior.EXCLUSIVE)
            .build()
        )
        .setAdjustableQuantity(
          SessionCreateParams.LineItem.AdjustableQuantity.builder()
            .setEnabled(true)
            .setMinimum(1L)
            .setMaximum(10L)
            .build()
        )
        .setQuantity(1L)
        .build()
    )
    .setAutomaticTax(SessionCreateParams.AutomaticTax.builder().setEnabled(true).build())
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
      price_data: {
        currency: 'usd',
        product_data: {
          name: 'T-shirt',
        },
        unit_amount: 2000,
        tax_behavior: 'exclusive',
      },
      adjustable_quantity: {
        enabled: true,
        minimum: 1,
        maximum: 10,
      },
      quantity: 1,
    },
  ],
  automatic_tax: {
    enabled: true,
  },
  mode: 'payment',
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
      "price_data": {
        "currency": "usd",
        "product_data": {"name": "T-shirt"},
        "unit_amount": 2000,
        "tax_behavior": "exclusive",
      },
      "adjustable_quantity": {"enabled": True, "minimum": 1, "maximum": 10},
      "quantity": 1,
    },
  ],
  automatic_tax={"enabled": True},
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
      'price_data' => [
        'currency' => 'usd',
        'product_data' => ['name' => 'T-shirt'],
        'unit_amount' => 2000,
        'tax_behavior' => 'exclusive',
      ],
      'adjustable_quantity' => [
        'enabled' => true,
        'minimum' => 1,
        'maximum' => 10,
      ],
      'quantity' => 1,
    ],
  ],
  'automatic_tax' => ['enabled' => true],
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
      price_data: {
        currency: 'usd',
        product_data: {name: 'T-shirt'},
        unit_amount: 2000,
        tax_behavior: 'exclusive',
      },
      adjustable_quantity: {
        enabled: true,
        minimum: 1,
        maximum: 10,
      },
      quantity: 1,
    },
  ],
  automatic_tax: {enabled: true},
  mode: 'payment',
  success_url: 'https://example.com/success',
  cancel_url: 'https://example.com/cancel',
})
```

## Handle completed transactions 

After the payment completes, you can make a request for the finalized [line items](https://docs.stripe.com/api/checkout/sessions/line_items.md) and their quantities. If your customer removes a line item, it is also removed from the line items response. See the [Fulfillment guide](https://docs.stripe.com/checkout/fulfillment.md) to learn how to create an event handler to handle completed Checkout Sessions.

To test your event handler, [install the Stripe CLI](https://docs.stripe.com/stripe-cli.md) and use
`stripe listen --forward-to localhost:4242/webhook` to
[forward events to your local server](https://docs.stripe.com/webhooks.md#test-webhook).

```ruby
\# Set your secret key. Remember to switch to your live secret key in production!
# See your keys here: https://dashboard.stripe.com/apikeys
Stripe.api_key = "<<secret key>>"

require 'sinatra'

# You can find your endpoint's secret in your webhook settings
endpoint_secret = 'whsec_...'

post '/webhook' do
  event = nil

  # Verify webhook signature and extract the event
  # See https://stripe.com/docs/webhooks#verify-events for more information.
  begin
    sig_header = request.env['HTTP_STRIPE_SIGNATURE']
    payload = request.body.read
    event = Stripe::Webhook.construct_event(payload, sig_header, endpoint_secret)
  rescue JSON::ParserError => e
    # Invalid payload
    return status 400
  rescue Stripe::SignatureVerificationError => e
    # Invalid signature
    return status 400
  end

  if event['type'] == 'checkout.session.completed'
    checkout_session = event['data']['object']

    line_items = Stripe::Checkout::Session.list_line_items(checkout_session['id'], {limit: 100})

    # Fulfill the purchase...
    begin
      fulfill_order(checkout_session, line_items)
    rescue NotImplementedError => e
      return status 400
    end
  end

  status 200
end

def fulfill_order(checkout_session, line_items)
  # TODO: Remove error and implement...
  raise NotImplementedError.new(<<~MSG)
    Given the Checkout Session "#{checkout_session.id}" load your internal order from the database here.
    Then you can reconcile your order's quantities with the final line item quantity purchased. You can use `checkout_session.metadata` and `price.metadata` to store and later reference your internal order and item ids.
  MSG
end
```

```python
import stripe

# Using Django
from django.http import HttpResponse

# Set your secret key. Remember to switch to your live secret key in production!
# See your keys here: https://dashboard.stripe.com/apikeys
stripe.api_key = '<<secret key>>'

# You can find your endpoint's secret in your webhook settings
endpoint_secret = 'whsec_...'

@csrf_exempt
def my_webhook_view(request):
  payload = request.body
  sig_header = request.META['HTTP_STRIPE_SIGNATURE']
  event = None

  try:
    event = stripe.Webhook.construct_event(
      payload, sig_header, endpoint_secret
    )
  except ValueError as e:
    # Invalid payload
    return HttpResponse(status=400)
  except stripe.error.SignatureVerificationError as e:
    # Invalid signature
    return HttpResponse(status=400)

  # Handle the checkout.session.completed event
  if event['type'] == 'checkout.session.completed':
    session = event['data']['object']

    line_items = stripe.checkout.Session.list_line_items(session['id'], limit=100)

    # Fulfill the purchase...
    try:
      fulfill_order(session, line_items)
    except NotImplementedError as e:
      return HttpResponse(status=400)

  # Passed signature verification
  return HttpResponse(status=200)

def fulfill_order(session, line_items):
  # TODO: Remove error and implement...
  raise NotImplementedError("Given the Checkout Session \"" + session['id'] + "\", load your internal order from the database here.\nThen you can reconcile your order's quantities with the final line item quantity purchased.\nYou can use `checkout_session.metadata` and `price.metadata` to store and later reference your internal order and item ids.")
```

```php
// Set your secret key. Remember to switch to your live secret key in production!
// See your keys here: https://dashboard.stripe.com/apikeys
\Stripe\Stripe::setApiKey('<<secret key>>');

// You can find your endpoint's secret in your webhook settings
$endpoint_secret = 'whsec_...';

$payload = @file_get_contents('php://input');
$sig_header = $_SERVER['HTTP_STRIPE_SIGNATURE'];
$event = null;

try {
  $event = \Stripe\Webhook::constructEvent(
    $payload, $sig_header, $endpoint_secret
  );
} catch(\UnexpectedValueException $e) {
  // Invalid payload
  http_response_code(400);
  exit();
} catch(\Stripe\Exception\SignatureVerificationException $e) {
  // Invalid signature
  http_response_code(400);
  exit();
}

function fulfill_order($session, $line_items) {
  // TODO: Remove error and implement...
  throw new Exception("given the Checkout Session $session->id, load your internal order from the database here.\nThen you can reconcile your order's quantities with the final line item quantity purchased.\nYou can use `checkout_session.metadata` and `price.metadata` to store and later reference your internal order and item ids.")
}

// Handle the checkout.session.completed event
if ($event->type == 'checkout.session.completed') {
  $session = $event->data->object;
  $line_items = \Stripe\Checkout\Session::allLineItems($session->id, ['limit' => 100]);
  // Fulfill the purchase...
  try {
    fulfill_order($session, $line_items);
  } catch(\Exception $e) {
    http_response_code(400);
    exit();
  }
}

http_response_code(200);
```

```java
// Set your secret key. Remember to switch to your live secret key in production!
// See your keys here: https://dashboard.stripe.com/apikeys
Stripe.apiKey = "<<secret key>>";

// You can find your endpoint's secret in your webhook settings
String endpointSecret = "whsec_...";

public void fulfillOrder(Session session, LineItemCollection lineItems) {
  // TODO: Remove error and implement...
  String error = String.format("Given the Checkout Session \"%s\" load your internal order from the database here.\nThen you can reconcile your order's quantities with the final line item quantity purchased. You can use `checkout_session.metadata` and `price.metadata` to store and later reference your internal order and item ids.", session.getId());
  throw new UnsupportedOperationException(error);
}

// Using the Spark framework (http://sparkjava.com)
public Object handle(Request request, Response response) {
  String payload = request.body();
  String sigHeader = request.headers("Stripe-Signature");
  Event event = null;

  try {
    event = Webhook.constructEvent(payload, sigHeader, endpointSecret);
  } catch (JsonSyntaxException e) {
    // Invalid payload
    response.status(400);
    return "";
  } catch (SignatureVerificationException e) {
    // Invalid signature
    response.status(400);
    return "";
  }

  // Handle the checkout.session.completed event
  if ("checkout.session.completed".equals(event.getType())) {
    Session session = (Session) event.getDataObjectDeserializer().getObject();
    Map<String, Object> params = new HashMap<>();
    params.put("limit", 100);
    LineItemCollection lineItems = session.listLineItems(params);

    // Fulfill the purchase...
    try {
      fulfillOrder(session, lineItems);
    } catch (NotImplementedException e) {
      response.status(400);
      return "";
    }
  }

  response.status(200);
  return "";
}
```

```javascript
// Set your secret key. Remember to switch to your live secret key in production!
// See your keys here: https://dashboard.stripe.com/apikeys
const stripe = require('stripe')('<<secret key>>');

// Find your endpoint's secret in your Dashboard's webhook settings
const endpointSecret = 'whsec_...';

// Using Express
const app = require('express')();

// Use body-parser to retrieve the raw body as a buffer
const bodyParser = require('body-parser');

const fulfillOrder = (session, lineItems) => {
  // TODO: Remove error and implement...
  throw new Error(`
    Given the Checkout Session ${session.id}, load your internal order from the database here.
    Then you can reconcile your order's quantities with the final line item quantity purchased. You can use \`checkout_session.metadata\` and \`price.metadata\` to store and later reference your internal order and item ids.`
  );
}

app.post('/webhook', bodyParser.raw({type: 'application/json'}), (request, response) => {
  const payload = request.body;
  const sig = request.headers['stripe-signature'];

  let event;

  try {
    event = stripe.webhooks.constructEvent(payload, sig, endpointSecret);
  } catch (err) {
    return response.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Handle the checkout.session.completed event
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;

    stripe.checkout.sessions.listLineItems(
      session.id,
      { limit: 100 },
      function(err, lineItems) {
        // Fulfill the purchase...
        try {
          fulfillOrder(session, lineItems);
        } catch (err) {
          return response.status(400).send(`Fulfillment Error: ${err.message}`);
        }
      }
    );
  }

  response.status(200).end();
});

app.listen(4242, () => console.log('Running on port 4242'));
```

```go
// Set your secret key. Remember to switch to your live secret key in production!
// See your keys here: https://dashboard.stripe.com/apikeys
stripe.Key = "<<secret key>>"

func fulfillOrder(session stripe.CheckoutSession) error {
  params := &stripe.CheckoutSessionListLineItemParams{
    ID: stripe.String(session.Id),
  }
  // Grab the line items for the session
  params.Filters.AddFilter("limit", "", "100")
  i := session.ListLineItems(params)
  for i.Next() {
    // Access the line item using i.LineItem()
  }

  // TODO: Remove error and implement...
  return fmt.Errorf("given the Checkout Session %q, load your internal order from the database here.\nThen you can reconcile your order's quantities with the final line item quantity purchased.\nYou can use `checkout_session.metadata` and `price.metadata` to store and later reference your internal order and item ids.", session.Id)
}

http.HandleFunc("/webhook", func(w http.ResponseWriter, req *http.Request) {
  const maxBodyBytes = int64(65536)
  req.Body = http.MaxBytesReader(w, req.Body, maxBodyBytes)

  body, err := ioutil.ReadAll(req.Body)
  if err != nil {
    fmt.Fprintf(os.Stderr, "Error reading request body: %v\n", err)
    w.WriteHeader(http.StatusServiceUnavailable)
    return
  }

  // Pass the request body and Stripe-Signature header to ConstructEvent, along with the webhook signing key
  // You can find your endpoint's secret in your webhook settings
  endpointSecret := "whsec_...";
  event, err := webhook.ConstructEvent(body, req.Header.Get("Stripe-Signature"), endpointSecret)

  if err != nil {
    fmt.Fprintf(os.Stderr, "Error verifying webhook signature: %v\n", err)
    w.WriteHeader(http.StatusBadRequest) // Return a 400 error on a bad signature
    return
  }

  // Handle the checkout.session.completed event
  if event.Type == "checkout.session.completed" {
    var session stripe.CheckoutSession
    err := json.Unmarshal(event.Data.Raw, &session)
    if err != nil {
      fmt.Fprintf(os.Stderr, "Error parsing webhook JSON: %v\n", err)
      w.WriteHeader(http.StatusBadRequest)
      return
    }

    // Fulfill the purchase...
    if err := fulfillOrder(session); err != nil {
      fmt.Fprintf(os.Stderr, "Error fulfilling order: %v\n", err)
      w.WriteHeader(http.StatusBadRequest)
      return
    }
  }

  w.WriteHeader(http.StatusOK)
})
```

```dotnet
using System;
using System.IO;
using Microsoft.AspNetCore.Mvc;
using Stripe;

// Set your secret key. Remember to switch to your live secret key in production!
// See your keys here: https://dashboard.stripe.com/apikeys
StripeConfiguration.ApiKey = "<<secret key>>";

namespace workspace.Controllers
{
  [Route("api/[controller]")]
  public class StripeWebHook : Controller
  {
    // You can find your endpoint's secret in your webhook settings
    const string secret = "whsec_...";

    [HttpPost]
    public async Task<IActionResult> Index()
    {
      var json = await new StreamReader(HttpContext.Request.Body).ReadToEndAsync();

      try
      {
        var stripeEvent = EventUtility.ConstructEvent(
          json,
          Request.Headers["Stripe-Signature"],
          secret
        );

        // Handle the checkout.session.completed event
        // If on SDK version < 46, use class Events instead of EventTypes
        if (stripeEvent.Type == EventTypes.CheckoutSessionCompleted)
        {
          var session = stripeEvent.Data.Object as Checkout.Session;

          // Fulfill the purchase...
          try
          {
            this.FulfillOrder(session);
          }
          catch (NotImplementedException ex)
          {
            return BadRequest();
          }
        }

        return Ok();
      }
      catch (StripeException e)
      {
        return BadRequest();
      }
    }

    private void FulfillOrder(Checkout.Session session) {
      var options = new SessionListLineItemsOptions
      {
        Limit = 100,
      };
      var service = new SessionService();
      StripeList<LineItem> lineItems = service.ListLineItems(session.Id, options);

      // TODO: Remove error and implement...
      throw new NotImplementedException($"Given the Checkout Session \"{session.Id}\" load your internal order from the database here.\n Then you can reconcile your order's quantities with the final line item quantity purchased. You can use `checkout_session.metadata` and `price.metadata` to store and later reference your internal order and item ids.");
    }
  }
}
```

# Embedded form

> This is a Embedded form for when payment-ui is embedded-form. View the original doc at https://docs.stripe.com/payments/checkout/adjustable-quantity?payment-ui=embedded-form.

The line items for each [Checkout Session](https://docs.stripe.com/api/checkout/sessions.md) keep track of what your customer is purchasing. You can configure the Checkout Session so customers can adjust line item quantities during checkout.

## Create a Checkout Session with an adjustable quantity 

Set `adjustable_quantity` on your `line_items` when creating a Checkout Session to enable your customers to update the quantity of an item during checkout.

You can customize the default settings for the minimum and maximum quantities allowed by setting `adjustable_quantity.minimum` and `adjustable_quantity.maximum`. By default, an item’s minimum adjustable quantity is `0` and the maximum adjustable quantity is `99`. You can specify a value of up to `999999` for `adjustable_quantity.maximum`.

When using adjustable quantities with a `line_items[].quantity` value greater than `99` (the default adjustable maximum), set `adjustable_quantity.maximum` to be greater than or equal to that item’s quantity.

If you use adjustable quantities, change your configuration so that it uses `adjustable_quantity.maximum` when creating the Checkout Session to reserve inventory quantity instead of the `line_items` quantity.

Checkout prevents the customer from removing an item if it is the only item remaining.

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
                Currency = "usd",
                ProductData = new Stripe.Checkout.SessionLineItemPriceDataProductDataOptions
                {
                    Name = "T-shirt",
                },
                UnitAmount = 2000,
                TaxBehavior = "exclusive",
            },
            AdjustableQuantity = new Stripe.Checkout.SessionLineItemAdjustableQuantityOptions
            {
                Enabled = true,
                Minimum = 1,
                Maximum = 10,
            },
            Quantity = 1,
        },
    },
    AutomaticTax = new Stripe.Checkout.SessionAutomaticTaxOptions { Enabled = true },
    Mode = "payment",
    UiMode = "embedded",
    ReturnUrl = "https://example.com/return",
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
        Currency: stripe.String(string(stripe.CurrencyUSD)),
        ProductData: &stripe.CheckoutSessionLineItemPriceDataProductDataParams{
          Name: stripe.String("T-shirt"),
        },
        UnitAmount: stripe.Int64(2000),
        TaxBehavior: stripe.String("exclusive"),
      },
      AdjustableQuantity: &stripe.CheckoutSessionLineItemAdjustableQuantityParams{
        Enabled: stripe.Bool(true),
        Minimum: stripe.Int64(1),
        Maximum: stripe.Int64(10),
      },
      Quantity: stripe.Int64(1),
    },
  },
  AutomaticTax: &stripe.CheckoutSessionAutomaticTaxParams{Enabled: stripe.Bool(true)},
  Mode: stripe.String(string(stripe.CheckoutSessionModePayment)),
  UIMode: stripe.String(string(stripe.CheckoutSessionUIModeEmbedded)),
  ReturnURL: stripe.String("https://example.com/return"),
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
            .setCurrency("usd")
            .setProductData(
              SessionCreateParams.LineItem.PriceData.ProductData.builder()
                .setName("T-shirt")
                .build()
            )
            .setUnitAmount(2000L)
            .setTaxBehavior(SessionCreateParams.LineItem.PriceData.TaxBehavior.EXCLUSIVE)
            .build()
        )
        .setAdjustableQuantity(
          SessionCreateParams.LineItem.AdjustableQuantity.builder()
            .setEnabled(true)
            .setMinimum(1L)
            .setMaximum(10L)
            .build()
        )
        .setQuantity(1L)
        .build()
    )
    .setAutomaticTax(SessionCreateParams.AutomaticTax.builder().setEnabled(true).build())
    .setMode(SessionCreateParams.Mode.PAYMENT)
    .setUiMode(SessionCreateParams.UiMode.EMBEDDED)
    .setReturnUrl("https://example.com/return")
    .build();

Session session = Session.create(params);
```

```node
const stripe = require('stripe')('<<secret key>>');

const session = await stripe.checkout.sessions.create({
  line_items: [
    {
      price_data: {
        currency: 'usd',
        product_data: {
          name: 'T-shirt',
        },
        unit_amount: 2000,
        tax_behavior: 'exclusive',
      },
      adjustable_quantity: {
        enabled: true,
        minimum: 1,
        maximum: 10,
      },
      quantity: 1,
    },
  ],
  automatic_tax: {
    enabled: true,
  },
  mode: 'payment',
  ui_mode: 'embedded',
  return_url: 'https://example.com/return',
});
```

```python
import stripe
stripe.api_key = "<<secret key>>"

stripe.checkout.Session.create(
  line_items=[
    {
      "price_data": {
        "currency": "usd",
        "product_data": {"name": "T-shirt"},
        "unit_amount": 2000,
        "tax_behavior": "exclusive",
      },
      "adjustable_quantity": {"enabled": True, "minimum": 1, "maximum": 10},
      "quantity": 1,
    },
  ],
  automatic_tax={"enabled": True},
  mode="payment",
  ui_mode="embedded",
  return_url="https://example.com/return",
)
```

```php
$stripe = new \Stripe\StripeClient('<<secret key>>');

$stripe->checkout->sessions->create([
  'line_items' => [
    [
      'price_data' => [
        'currency' => 'usd',
        'product_data' => ['name' => 'T-shirt'],
        'unit_amount' => 2000,
        'tax_behavior' => 'exclusive',
      ],
      'adjustable_quantity' => [
        'enabled' => true,
        'minimum' => 1,
        'maximum' => 10,
      ],
      'quantity' => 1,
    ],
  ],
  'automatic_tax' => ['enabled' => true],
  'mode' => 'payment',
  'ui_mode' => 'embedded',
  'return_url' => 'https://example.com/return',
]);
```

```ruby
Stripe.api_key = '<<secret key>>'

Stripe::Checkout::Session.create({
  line_items: [
    {
      price_data: {
        currency: 'usd',
        product_data: {name: 'T-shirt'},
        unit_amount: 2000,
        tax_behavior: 'exclusive',
      },
      adjustable_quantity: {
        enabled: true,
        minimum: 1,
        maximum: 10,
      },
      quantity: 1,
    },
  ],
  automatic_tax: {enabled: true},
  mode: 'payment',
  ui_mode: 'embedded',
  return_url: 'https://example.com/return',
})
```

## Handle completed transactions 

After the payment completes, you can make a request for the finalized [line items](https://docs.stripe.com/api/checkout/sessions/line_items.md) and their quantities. If your customer removes a line item, it is also removed from the line items response. See the [Fulfillment guide](https://docs.stripe.com/checkout/fulfillment.md) to learn how to create an event handler to handle completed Checkout Sessions.

To test your event handler, [install the Stripe CLI](https://docs.stripe.com/stripe-cli.md) and use
`stripe listen --forward-to localhost:4242/webhook` to
[forward events to your local server](https://docs.stripe.com/webhooks.md#test-webhook).

```ruby
\# Set your secret key. Remember to switch to your live secret key in production!
# See your keys here: https://dashboard.stripe.com/apikeys
Stripe.api_key = "<<secret key>>"

require 'sinatra'

# You can find your endpoint's secret in your webhook settings
endpoint_secret = 'whsec_...'

post '/webhook' do
  event = nil

  # Verify webhook signature and extract the event
  # See https://stripe.com/docs/webhooks#verify-events for more information.
  begin
    sig_header = request.env['HTTP_STRIPE_SIGNATURE']
    payload = request.body.read
    event = Stripe::Webhook.construct_event(payload, sig_header, endpoint_secret)
  rescue JSON::ParserError => e
    # Invalid payload
    return status 400
  rescue Stripe::SignatureVerificationError => e
    # Invalid signature
    return status 400
  end

  if event['type'] == 'checkout.session.completed'
    checkout_session = event['data']['object']

    line_items = Stripe::Checkout::Session.list_line_items(checkout_session['id'], {limit: 100})

    # Fulfill the purchase...
    begin
      fulfill_order(checkout_session, line_items)
    rescue NotImplementedError => e
      return status 400
    end
  end

  status 200
end

def fulfill_order(checkout_session, line_items)
  # TODO: Remove error and implement...
  raise NotImplementedError.new(<<~MSG)
    Given the Checkout Session "#{checkout_session.id}" load your internal order from the database here.
    Then you can reconcile your order's quantities with the final line item quantity purchased. You can use `checkout_session.metadata` and `price.metadata` to store and later reference your internal order and item ids.
  MSG
end
```

```python
import stripe

# Using Django
from django.http import HttpResponse

# Set your secret key. Remember to switch to your live secret key in production!
# See your keys here: https://dashboard.stripe.com/apikeys
stripe.api_key = '<<secret key>>'

# You can find your endpoint's secret in your webhook settings
endpoint_secret = 'whsec_...'

@csrf_exempt
def my_webhook_view(request):
  payload = request.body
  sig_header = request.META['HTTP_STRIPE_SIGNATURE']
  event = None

  try:
    event = stripe.Webhook.construct_event(
      payload, sig_header, endpoint_secret
    )
  except ValueError as e:
    # Invalid payload
    return HttpResponse(status=400)
  except stripe.error.SignatureVerificationError as e:
    # Invalid signature
    return HttpResponse(status=400)

  # Handle the checkout.session.completed event
  if event['type'] == 'checkout.session.completed':
    session = event['data']['object']

    line_items = stripe.checkout.Session.list_line_items(session['id'], limit=100)

    # Fulfill the purchase...
    try:
      fulfill_order(session, line_items)
    except NotImplementedError as e:
      return HttpResponse(status=400)

  # Passed signature verification
  return HttpResponse(status=200)

def fulfill_order(session, line_items):
  # TODO: Remove error and implement...
  raise NotImplementedError("Given the Checkout Session \"" + session['id'] + "\", load your internal order from the database here.\nThen you can reconcile your order's quantities with the final line item quantity purchased.\nYou can use `checkout_session.metadata` and `price.metadata` to store and later reference your internal order and item ids.")
```

```php
// Set your secret key. Remember to switch to your live secret key in production!
// See your keys here: https://dashboard.stripe.com/apikeys
\Stripe\Stripe::setApiKey('<<secret key>>');

// You can find your endpoint's secret in your webhook settings
$endpoint_secret = 'whsec_...';

$payload = @file_get_contents('php://input');
$sig_header = $_SERVER['HTTP_STRIPE_SIGNATURE'];
$event = null;

try {
  $event = \Stripe\Webhook::constructEvent(
    $payload, $sig_header, $endpoint_secret
  );
} catch(\UnexpectedValueException $e) {
  // Invalid payload
  http_response_code(400);
  exit();
} catch(\Stripe\Exception\SignatureVerificationException $e) {
  // Invalid signature
  http_response_code(400);
  exit();
}

function fulfill_order($session, $line_items) {
  // TODO: Remove error and implement...
  throw new Exception("given the Checkout Session $session->id, load your internal order from the database here.\nThen you can reconcile your order's quantities with the final line item quantity purchased.\nYou can use `checkout_session.metadata` and `price.metadata` to store and later reference your internal order and item ids.")
}

// Handle the checkout.session.completed event
if ($event->type == 'checkout.session.completed') {
  $session = $event->data->object;
  $line_items = \Stripe\Checkout\Session::allLineItems($session->id, ['limit' => 100]);
  // Fulfill the purchase...
  try {
    fulfill_order($session, $line_items);
  } catch(\Exception $e) {
    http_response_code(400);
    exit();
  }
}

http_response_code(200);
```

```java
// Set your secret key. Remember to switch to your live secret key in production!
// See your keys here: https://dashboard.stripe.com/apikeys
Stripe.apiKey = "<<secret key>>";

// You can find your endpoint's secret in your webhook settings
String endpointSecret = "whsec_...";

public void fulfillOrder(Session session, LineItemCollection lineItems) {
  // TODO: Remove error and implement...
  String error = String.format("Given the Checkout Session \"%s\" load your internal order from the database here.\nThen you can reconcile your order's quantities with the final line item quantity purchased. You can use `checkout_session.metadata` and `price.metadata` to store and later reference your internal order and item ids.", session.getId());
  throw new UnsupportedOperationException(error);
}

// Using the Spark framework (http://sparkjava.com)
public Object handle(Request request, Response response) {
  String payload = request.body();
  String sigHeader = request.headers("Stripe-Signature");
  Event event = null;

  try {
    event = Webhook.constructEvent(payload, sigHeader, endpointSecret);
  } catch (JsonSyntaxException e) {
    // Invalid payload
    response.status(400);
    return "";
  } catch (SignatureVerificationException e) {
    // Invalid signature
    response.status(400);
    return "";
  }

  // Handle the checkout.session.completed event
  if ("checkout.session.completed".equals(event.getType())) {
    Session session = (Session) event.getDataObjectDeserializer().getObject();
    Map<String, Object> params = new HashMap<>();
    params.put("limit", 100);
    LineItemCollection lineItems = session.listLineItems(params);

    // Fulfill the purchase...
    try {
      fulfillOrder(session, lineItems);
    } catch (NotImplementedException e) {
      response.status(400);
      return "";
    }
  }

  response.status(200);
  return "";
}
```

```javascript
// Set your secret key. Remember to switch to your live secret key in production!
// See your keys here: https://dashboard.stripe.com/apikeys
const stripe = require('stripe')('<<secret key>>');

// Find your endpoint's secret in your Dashboard's webhook settings
const endpointSecret = 'whsec_...';

// Using Express
const app = require('express')();

// Use body-parser to retrieve the raw body as a buffer
const bodyParser = require('body-parser');

const fulfillOrder = (session, lineItems) => {
  // TODO: Remove error and implement...
  throw new Error(`
    Given the Checkout Session ${session.id}, load your internal order from the database here.
    Then you can reconcile your order's quantities with the final line item quantity purchased. You can use \`checkout_session.metadata\` and \`price.metadata\` to store and later reference your internal order and item ids.`
  );
}

app.post('/webhook', bodyParser.raw({type: 'application/json'}), (request, response) => {
  const payload = request.body;
  const sig = request.headers['stripe-signature'];

  let event;

  try {
    event = stripe.webhooks.constructEvent(payload, sig, endpointSecret);
  } catch (err) {
    return response.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Handle the checkout.session.completed event
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;

    stripe.checkout.sessions.listLineItems(
      session.id,
      { limit: 100 },
      function(err, lineItems) {
        // Fulfill the purchase...
        try {
          fulfillOrder(session, lineItems);
        } catch (err) {
          return response.status(400).send(`Fulfillment Error: ${err.message}`);
        }
      }
    );
  }

  response.status(200).end();
});

app.listen(4242, () => console.log('Running on port 4242'));
```

```go
// Set your secret key. Remember to switch to your live secret key in production!
// See your keys here: https://dashboard.stripe.com/apikeys
stripe.Key = "<<secret key>>"

func fulfillOrder(session stripe.CheckoutSession) error {
  params := &stripe.CheckoutSessionListLineItemParams{
    ID: stripe.String(session.Id),
  }
  // Grab the line items for the session
  params.Filters.AddFilter("limit", "", "100")
  i := session.ListLineItems(params)
  for i.Next() {
    // Access the line item using i.LineItem()
  }

  // TODO: Remove error and implement...
  return fmt.Errorf("given the Checkout Session %q, load your internal order from the database here.\nThen you can reconcile your order's quantities with the final line item quantity purchased.\nYou can use `checkout_session.metadata` and `price.metadata` to store and later reference your internal order and item ids.", session.Id)
}

http.HandleFunc("/webhook", func(w http.ResponseWriter, req *http.Request) {
  const maxBodyBytes = int64(65536)
  req.Body = http.MaxBytesReader(w, req.Body, maxBodyBytes)

  body, err := ioutil.ReadAll(req.Body)
  if err != nil {
    fmt.Fprintf(os.Stderr, "Error reading request body: %v\n", err)
    w.WriteHeader(http.StatusServiceUnavailable)
    return
  }

  // Pass the request body and Stripe-Signature header to ConstructEvent, along with the webhook signing key
  // You can find your endpoint's secret in your webhook settings
  endpointSecret := "whsec_...";
  event, err := webhook.ConstructEvent(body, req.Header.Get("Stripe-Signature"), endpointSecret)

  if err != nil {
    fmt.Fprintf(os.Stderr, "Error verifying webhook signature: %v\n", err)
    w.WriteHeader(http.StatusBadRequest) // Return a 400 error on a bad signature
    return
  }

  // Handle the checkout.session.completed event
  if event.Type == "checkout.session.completed" {
    var session stripe.CheckoutSession
    err := json.Unmarshal(event.Data.Raw, &session)
    if err != nil {
      fmt.Fprintf(os.Stderr, "Error parsing webhook JSON: %v\n", err)
      w.WriteHeader(http.StatusBadRequest)
      return
    }

    // Fulfill the purchase...
    if err := fulfillOrder(session); err != nil {
      fmt.Fprintf(os.Stderr, "Error fulfilling order: %v\n", err)
      w.WriteHeader(http.StatusBadRequest)
      return
    }
  }

  w.WriteHeader(http.StatusOK)
})
```

```dotnet
using System;
using System.IO;
using Microsoft.AspNetCore.Mvc;
using Stripe;

// Set your secret key. Remember to switch to your live secret key in production!
// See your keys here: https://dashboard.stripe.com/apikeys
StripeConfiguration.ApiKey = "<<secret key>>";

namespace workspace.Controllers
{
  [Route("api/[controller]")]
  public class StripeWebHook : Controller
  {
    // You can find your endpoint's secret in your webhook settings
    const string secret = "whsec_...";

    [HttpPost]
    public async Task<IActionResult> Index()
    {
      var json = await new StreamReader(HttpContext.Request.Body).ReadToEndAsync();

      try
      {
        var stripeEvent = EventUtility.ConstructEvent(
          json,
          Request.Headers["Stripe-Signature"],
          secret
        );

        // Handle the checkout.session.completed event
        // If on SDK version < 46, use class Events instead of EventTypes
        if (stripeEvent.Type == EventTypes.CheckoutSessionCompleted)
        {
          var session = stripeEvent.Data.Object as Checkout.Session;

          // Fulfill the purchase...
          try
          {
            this.FulfillOrder(session);
          }
          catch (NotImplementedException ex)
          {
            return BadRequest();
          }
        }

        return Ok();
      }
      catch (StripeException e)
      {
        return BadRequest();
      }
    }

    private void FulfillOrder(Checkout.Session session) {
      var options = new SessionListLineItemsOptions
      {
        Limit = 100,
      };
      var service = new SessionService();
      StripeList<LineItem> lineItems = service.ListLineItems(session.Id, options);

      // TODO: Remove error and implement...
      throw new NotImplementedException($"Given the Checkout Session \"{session.Id}\" load your internal order from the database here.\n Then you can reconcile your order's quantities with the final line item quantity purchased. You can use `checkout_session.metadata` and `price.metadata` to store and later reference your internal order and item ids.");
    }
  }
}
```

# Embedded components

> This is a Embedded components for when payment-ui is embedded-components. View the original doc at https://docs.stripe.com/payments/checkout/adjustable-quantity?payment-ui=embedded-components.

The line items for each [Checkout Session](https://docs.stripe.com/api/checkout/sessions.md) keep track of what your customer is purchasing. You can configure the Checkout Session so customers can adjust line item quantities during checkout.

## Enable adjustable quantities

Other line item updates, such as adding new line items, aren’t supported for this integration.

Set [adjustable_quantity](https://docs.stripe.com/api/checkout/sessions/create.md#create_checkout_session-line_items-adjustable_quantity) on your [line_items](https://docs.stripe.com/api/checkout/sessions/create.md#create_checkout_session-line_items) when creating a Checkout Session to enable your customers to update the quantity of an item during checkout.

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
                Currency = "usd",
                ProductData = new Stripe.Checkout.SessionLineItemPriceDataProductDataOptions
                {
                    Name = "T-shirt",
                },
                UnitAmount = 2000,
            },
            Quantity = 1,
            AdjustableQuantity = new Stripe.Checkout.SessionLineItemAdjustableQuantityOptions
            {
                Enabled = true,
                Maximum = 100,
                Minimum = 0,
            },
        },
    },
    Mode = "payment",
    UiMode = "custom",
    ReturnUrl = "{{RETURN_URL}}",
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
        Currency: stripe.String(string(stripe.CurrencyUSD)),
        ProductData: &stripe.CheckoutSessionLineItemPriceDataProductDataParams{
          Name: stripe.String("T-shirt"),
        },
        UnitAmount: stripe.Int64(2000),
      },
      Quantity: stripe.Int64(1),
      AdjustableQuantity: &stripe.CheckoutSessionLineItemAdjustableQuantityParams{
        Enabled: stripe.Bool(true),
        Maximum: stripe.Int64(100),
        Minimum: stripe.Int64(0),
      },
    },
  },
  Mode: stripe.String(string(stripe.CheckoutSessionModePayment)),
  UIMode: stripe.String(string(stripe.CheckoutSessionUIModeCustom)),
  ReturnURL: stripe.String("{{RETURN_URL}}"),
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
            .setCurrency("usd")
            .setProductData(
              SessionCreateParams.LineItem.PriceData.ProductData.builder()
                .setName("T-shirt")
                .build()
            )
            .setUnitAmount(2000L)
            .build()
        )
        .setQuantity(1L)
        .setAdjustableQuantity(
          SessionCreateParams.LineItem.AdjustableQuantity.builder()
            .setEnabled(true)
            .setMaximum(100L)
            .setMinimum(0L)
            .build()
        )
        .build()
    )
    .setMode(SessionCreateParams.Mode.PAYMENT)
    .setUiMode(SessionCreateParams.UiMode.CUSTOM)
    .setReturnUrl("{{RETURN_URL}}")
    .build();

Session session = Session.create(params);
```

```node
const stripe = require('stripe')('<<secret key>>');

const session = await stripe.checkout.sessions.create({
  line_items: [
    {
      price_data: {
        currency: 'usd',
        product_data: {
          name: 'T-shirt',
        },
        unit_amount: 2000,
      },
      quantity: 1,
      adjustable_quantity: {
        enabled: true,
        maximum: 100,
        minimum: 0,
      },
    },
  ],
  mode: 'payment',
  ui_mode: 'custom',
  return_url: '{{RETURN_URL}}',
});
```

```python
import stripe
stripe.api_key = "<<secret key>>"

stripe.checkout.Session.create(
  line_items=[
    {
      "price_data": {"currency": "usd", "product_data": {"name": "T-shirt"}, "unit_amount": 2000},
      "quantity": 1,
      "adjustable_quantity": {"enabled": True, "maximum": 100, "minimum": 0},
    },
  ],
  mode="payment",
  ui_mode="custom",
  return_url="{{RETURN_URL}}",
)
```

```php
$stripe = new \Stripe\StripeClient('<<secret key>>');

$stripe->checkout->sessions->create([
  'line_items' => [
    [
      'price_data' => [
        'currency' => 'usd',
        'product_data' => ['name' => 'T-shirt'],
        'unit_amount' => 2000,
      ],
      'quantity' => 1,
      'adjustable_quantity' => [
        'enabled' => true,
        'maximum' => 100,
        'minimum' => 0,
      ],
    ],
  ],
  'mode' => 'payment',
  'ui_mode' => 'custom',
  'return_url' => '{{RETURN_URL}}',
]);
```

```ruby
Stripe.api_key = '<<secret key>>'

Stripe::Checkout::Session.create({
  line_items: [
    {
      price_data: {
        currency: 'usd',
        product_data: {name: 'T-shirt'},
        unit_amount: 2000,
      },
      quantity: 1,
      adjustable_quantity: {
        enabled: true,
        maximum: 100,
        minimum: 0,
      },
    },
  ],
  mode: 'payment',
  ui_mode: 'custom',
  return_url: '{{RETURN_URL}}',
})
```

You can customize the default settings for the minimum and maximum quantities allowed by setting [adjustable_quantity.minimum](https://docs.stripe.com/api/checkout/sessions/create.md#create_checkout_session-line_items-adjustable_quantity-minimum) and [adjustable_quantity.maximum](https://docs.stripe.com/api/checkout/sessions/create.md#create_checkout_session-line_items-adjustable_quantity-maximum). By default, an item’s minimum adjustable quantity is 0 and the maximum adjustable quantity is 99. You can specify a value of up to 999999 for `adjustable_quantity.maximum`.

Checkout prevents the customer from removing an item if it is the only item remaining.

## Update line item quantities

Use [updateLineItemQuantity](https://docs.stripe.com/js/custom_checkout/update_line_item_quantity) to change a line item’s quantity in response to customer interaction, such as a button to increment the quantity. Pass the [line item ID](https://docs.stripe.com/js/custom_checkout/session_object#custom_checkout_session_object-lineItems-id) and the new quantity:

```html
<button class="increment-quantity-button" data-line-item="{{line item ID}}">+</button>
```

```js
stripe.initCheckout({fetchClientSecret}).then((checkout) => {
  const button = document.querySelector('.increment-quantity-button');
  const lineItem = button.getAttribute("data-line-item");
  const quantity = checkout.session().lineItems.find((li) => li.id === lineItem).quantity;
  button.addEventListener('click', () => {
    checkout.updateLineItemQuantity({
      lineItem,
      quantity: quantity + 1,
    })
  })
});
```

```jsx
import React from 'react';
import {useCheckout} from '@stripe/react-stripe-js';

const IncrementLineItemButton = (props) => {
  const {updateLineItemQuantity} = useCheckout();

  const handleClick = () => {
    updateLineItemQuantity({
      lineItem: props.lineItem,
      quantity: props.quantity + 1,
    });
  };
  return <button onClick={handleClick}>+</button>;
};

export default IncrementLineItemButton;
```

## Handle completed transactions

After the payment completes, you can make a request for the finalized [line items](https://docs.stripe.com/api/checkout/sessions/line_items.md) and their quantities. If your customer removes a line item, it is also removed from the line items response. See the [Fulfillment guide](https://docs.stripe.com/checkout/fulfillment.md) to learn how to create an event handler to handle completed Checkout Sessions.

To test your event handler, [install the Stripe CLI](https://docs.stripe.com/stripe-cli.md) and use
`stripe listen --forward-to localhost:4242/webhook` to
[forward events to your local server](https://docs.stripe.com/webhooks.md#test-webhook).

```ruby
\# Set your secret key. Remember to switch to your live secret key in production!
# See your keys here: https://dashboard.stripe.com/apikeys
Stripe.api_key = "<<secret key>>"

require 'sinatra'

# You can find your endpoint's secret in your webhook settings
endpoint_secret = 'whsec_...'

post '/webhook' do
  event = nil

  # Verify webhook signature and extract the event
  # See https://stripe.com/docs/webhooks#verify-events for more information.
  begin
    sig_header = request.env['HTTP_STRIPE_SIGNATURE']
    payload = request.body.read
    event = Stripe::Webhook.construct_event(payload, sig_header, endpoint_secret)
  rescue JSON::ParserError => e
    # Invalid payload
    return status 400
  rescue Stripe::SignatureVerificationError => e
    # Invalid signature
    return status 400
  end

  if event['type'] == 'checkout.session.completed'
    checkout_session = event['data']['object']

    line_items = Stripe::Checkout::Session.list_line_items(checkout_session['id'], {limit: 100})

    # Fulfill the purchase...
    begin
      fulfill_order(checkout_session, line_items)
    rescue NotImplementedError => e
      return status 400
    end
  end

  status 200
end

def fulfill_order(checkout_session, line_items)
  # TODO: Remove error and implement...
  raise NotImplementedError.new(<<~MSG)
    Given the Checkout Session "#{checkout_session.id}" load your internal order from the database here.
    Then you can reconcile your order's quantities with the final line item quantity purchased. You can use `checkout_session.metadata` and `price.metadata` to store and later reference your internal order and item ids.
  MSG
end
```

```python
import stripe

# Using Django
from django.http import HttpResponse

# Set your secret key. Remember to switch to your live secret key in production!
# See your keys here: https://dashboard.stripe.com/apikeys
stripe.api_key = '<<secret key>>'

# You can find your endpoint's secret in your webhook settings
endpoint_secret = 'whsec_...'

@csrf_exempt
def my_webhook_view(request):
  payload = request.body
  sig_header = request.META['HTTP_STRIPE_SIGNATURE']
  event = None

  try:
    event = stripe.Webhook.construct_event(
      payload, sig_header, endpoint_secret
    )
  except ValueError as e:
    # Invalid payload
    return HttpResponse(status=400)
  except stripe.error.SignatureVerificationError as e:
    # Invalid signature
    return HttpResponse(status=400)

  # Handle the checkout.session.completed event
  if event['type'] == 'checkout.session.completed':
    session = event['data']['object']

    line_items = stripe.checkout.Session.list_line_items(session['id'], limit=100)

    # Fulfill the purchase...
    try:
      fulfill_order(session, line_items)
    except NotImplementedError as e:
      return HttpResponse(status=400)

  # Passed signature verification
  return HttpResponse(status=200)

def fulfill_order(session, line_items):
  # TODO: Remove error and implement...
  raise NotImplementedError("Given the Checkout Session \"" + session['id'] + "\", load your internal order from the database here.\nThen you can reconcile your order's quantities with the final line item quantity purchased.\nYou can use `checkout_session.metadata` and `price.metadata` to store and later reference your internal order and item ids.")
```

```php
// Set your secret key. Remember to switch to your live secret key in production!
// See your keys here: https://dashboard.stripe.com/apikeys
\Stripe\Stripe::setApiKey('<<secret key>>');

// You can find your endpoint's secret in your webhook settings
$endpoint_secret = 'whsec_...';

$payload = @file_get_contents('php://input');
$sig_header = $_SERVER['HTTP_STRIPE_SIGNATURE'];
$event = null;

try {
  $event = \Stripe\Webhook::constructEvent(
    $payload, $sig_header, $endpoint_secret
  );
} catch(\UnexpectedValueException $e) {
  // Invalid payload
  http_response_code(400);
  exit();
} catch(\Stripe\Exception\SignatureVerificationException $e) {
  // Invalid signature
  http_response_code(400);
  exit();
}

function fulfill_order($session, $line_items) {
  // TODO: Remove error and implement...
  throw new Exception("given the Checkout Session $session->id, load your internal order from the database here.\nThen you can reconcile your order's quantities with the final line item quantity purchased.\nYou can use `checkout_session.metadata` and `price.metadata` to store and later reference your internal order and item ids.")
}

// Handle the checkout.session.completed event
if ($event->type == 'checkout.session.completed') {
  $session = $event->data->object;
  $line_items = \Stripe\Checkout\Session::allLineItems($session->id, ['limit' => 100]);
  // Fulfill the purchase...
  try {
    fulfill_order($session, $line_items);
  } catch(\Exception $e) {
    http_response_code(400);
    exit();
  }
}

http_response_code(200);
```

```java
// Set your secret key. Remember to switch to your live secret key in production!
// See your keys here: https://dashboard.stripe.com/apikeys
Stripe.apiKey = "<<secret key>>";

// You can find your endpoint's secret in your webhook settings
String endpointSecret = "whsec_...";

public void fulfillOrder(Session session, LineItemCollection lineItems) {
  // TODO: Remove error and implement...
  String error = String.format("Given the Checkout Session \"%s\" load your internal order from the database here.\nThen you can reconcile your order's quantities with the final line item quantity purchased. You can use `checkout_session.metadata` and `price.metadata` to store and later reference your internal order and item ids.", session.getId());
  throw new UnsupportedOperationException(error);
}

// Using the Spark framework (http://sparkjava.com)
public Object handle(Request request, Response response) {
  String payload = request.body();
  String sigHeader = request.headers("Stripe-Signature");
  Event event = null;

  try {
    event = Webhook.constructEvent(payload, sigHeader, endpointSecret);
  } catch (JsonSyntaxException e) {
    // Invalid payload
    response.status(400);
    return "";
  } catch (SignatureVerificationException e) {
    // Invalid signature
    response.status(400);
    return "";
  }

  // Handle the checkout.session.completed event
  if ("checkout.session.completed".equals(event.getType())) {
    Session session = (Session) event.getDataObjectDeserializer().getObject();
    Map<String, Object> params = new HashMap<>();
    params.put("limit", 100);
    LineItemCollection lineItems = session.listLineItems(params);

    // Fulfill the purchase...
    try {
      fulfillOrder(session, lineItems);
    } catch (NotImplementedException e) {
      response.status(400);
      return "";
    }
  }

  response.status(200);
  return "";
}
```

```javascript
// Set your secret key. Remember to switch to your live secret key in production!
// See your keys here: https://dashboard.stripe.com/apikeys
const stripe = require('stripe')('<<secret key>>');

// Find your endpoint's secret in your Dashboard's webhook settings
const endpointSecret = 'whsec_...';

// Using Express
const app = require('express')();

// Use body-parser to retrieve the raw body as a buffer
const bodyParser = require('body-parser');

const fulfillOrder = (session, lineItems) => {
  // TODO: Remove error and implement...
  throw new Error(`
    Given the Checkout Session ${session.id}, load your internal order from the database here.
    Then you can reconcile your order's quantities with the final line item quantity purchased. You can use \`checkout_session.metadata\` and \`price.metadata\` to store and later reference your internal order and item ids.`
  );
}

app.post('/webhook', bodyParser.raw({type: 'application/json'}), (request, response) => {
  const payload = request.body;
  const sig = request.headers['stripe-signature'];

  let event;

  try {
    event = stripe.webhooks.constructEvent(payload, sig, endpointSecret);
  } catch (err) {
    return response.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Handle the checkout.session.completed event
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;

    stripe.checkout.sessions.listLineItems(
      session.id,
      { limit: 100 },
      function(err, lineItems) {
        // Fulfill the purchase...
        try {
          fulfillOrder(session, lineItems);
        } catch (err) {
          return response.status(400).send(`Fulfillment Error: ${err.message}`);
        }
      }
    );
  }

  response.status(200).end();
});

app.listen(4242, () => console.log('Running on port 4242'));
```

```go
// Set your secret key. Remember to switch to your live secret key in production!
// See your keys here: https://dashboard.stripe.com/apikeys
stripe.Key = "<<secret key>>"

func fulfillOrder(session stripe.CheckoutSession) error {
  params := &stripe.CheckoutSessionListLineItemParams{
    ID: stripe.String(session.Id),
  }
  // Grab the line items for the session
  params.Filters.AddFilter("limit", "", "100")
  i := session.ListLineItems(params)
  for i.Next() {
    // Access the line item using i.LineItem()
  }

  // TODO: Remove error and implement...
  return fmt.Errorf("given the Checkout Session %q, load your internal order from the database here.\nThen you can reconcile your order's quantities with the final line item quantity purchased.\nYou can use `checkout_session.metadata` and `price.metadata` to store and later reference your internal order and item ids.", session.Id)
}

http.HandleFunc("/webhook", func(w http.ResponseWriter, req *http.Request) {
  const maxBodyBytes = int64(65536)
  req.Body = http.MaxBytesReader(w, req.Body, maxBodyBytes)

  body, err := ioutil.ReadAll(req.Body)
  if err != nil {
    fmt.Fprintf(os.Stderr, "Error reading request body: %v\n", err)
    w.WriteHeader(http.StatusServiceUnavailable)
    return
  }

  // Pass the request body and Stripe-Signature header to ConstructEvent, along with the webhook signing key
  // You can find your endpoint's secret in your webhook settings
  endpointSecret := "whsec_...";
  event, err := webhook.ConstructEvent(body, req.Header.Get("Stripe-Signature"), endpointSecret)

  if err != nil {
    fmt.Fprintf(os.Stderr, "Error verifying webhook signature: %v\n", err)
    w.WriteHeader(http.StatusBadRequest) // Return a 400 error on a bad signature
    return
  }

  // Handle the checkout.session.completed event
  if event.Type == "checkout.session.completed" {
    var session stripe.CheckoutSession
    err := json.Unmarshal(event.Data.Raw, &session)
    if err != nil {
      fmt.Fprintf(os.Stderr, "Error parsing webhook JSON: %v\n", err)
      w.WriteHeader(http.StatusBadRequest)
      return
    }

    // Fulfill the purchase...
    if err := fulfillOrder(session); err != nil {
      fmt.Fprintf(os.Stderr, "Error fulfilling order: %v\n", err)
      w.WriteHeader(http.StatusBadRequest)
      return
    }
  }

  w.WriteHeader(http.StatusOK)
})
```

```dotnet
using System;
using System.IO;
using Microsoft.AspNetCore.Mvc;
using Stripe;

// Set your secret key. Remember to switch to your live secret key in production!
// See your keys here: https://dashboard.stripe.com/apikeys
StripeConfiguration.ApiKey = "<<secret key>>";

namespace workspace.Controllers
{
  [Route("api/[controller]")]
  public class StripeWebHook : Controller
  {
    // You can find your endpoint's secret in your webhook settings
    const string secret = "whsec_...";

    [HttpPost]
    public async Task<IActionResult> Index()
    {
      var json = await new StreamReader(HttpContext.Request.Body).ReadToEndAsync();

      try
      {
        var stripeEvent = EventUtility.ConstructEvent(
          json,
          Request.Headers["Stripe-Signature"],
          secret
        );

        // Handle the checkout.session.completed event
        // If on SDK version < 46, use class Events instead of EventTypes
        if (stripeEvent.Type == EventTypes.CheckoutSessionCompleted)
        {
          var session = stripeEvent.Data.Object as Checkout.Session;

          // Fulfill the purchase...
          try
          {
            this.FulfillOrder(session);
          }
          catch (NotImplementedException ex)
          {
            return BadRequest();
          }
        }

        return Ok();
      }
      catch (StripeException e)
      {
        return BadRequest();
      }
    }

    private void FulfillOrder(Checkout.Session session) {
      var options = new SessionListLineItemsOptions
      {
        Limit = 100,
      };
      var service = new SessionService();
      StripeList<LineItem> lineItems = service.ListLineItems(session.Id, options);

      // TODO: Remove error and implement...
      throw new NotImplementedException($"Given the Checkout Session \"{session.Id}\" load your internal order from the database here.\n Then you can reconcile your order's quantities with the final line item quantity purchased. You can use `checkout_session.metadata` and `price.metadata` to store and later reference your internal order and item ids.");
    }
  }
}
```
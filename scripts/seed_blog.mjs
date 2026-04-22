import mysql from 'mysql2/promise';

const conn = await mysql.createConnection(process.env.DATABASE_URL);

const posts = [
  {
    slug: 'what-is-a-dynamic-qr-code',
    title: 'What Is a Dynamic QR Code? (And Why You Need One)',
    excerpt: 'Static QR codes are permanent — but dynamic QR codes let you change the destination anytime. Here\'s everything you need to know.',
    content: `# What Is a Dynamic QR Code?

A **dynamic QR code** is a QR code that contains a short redirect URL pointing to a server. When someone scans it, the server redirects them to the actual destination — which you can change at any time without reprinting the code.

## Static vs Dynamic QR Codes

| Feature | Static | Dynamic |
|---|---|---|
| Destination editable | ✗ | ✓ |
| Scan analytics | ✗ | ✓ |
| Requires server | ✗ | ✓ |
| Best for | One-time use | Ongoing campaigns |

## Why You Need Dynamic QR Codes

1. **Fix mistakes** — Update the destination if a URL changes
2. **Track performance** — See how many people scanned, when, and on what device
3. **A/B test** — Rotate destinations to test different landing pages
4. **Reuse printed materials** — Change campaigns without reprinting

Dynamic QR codes are essential for any business using QR codes in print, packaging, or signage.`,
    published: 1,
    publishedAt: new Date('2026-01-15'),
    tags: JSON.stringify(['dynamic-qr', 'basics', 'analytics']),
  },
  {
    slug: 'qr-code-best-practices-marketing-2026',
    title: 'QR Code Best Practices for Marketing in 2026',
    excerpt: 'From sizing to placement to tracking, here are the essential best practices for using QR codes in your marketing campaigns.',
    content: `# QR Code Best Practices for Marketing in 2026

QR codes have become a standard part of marketing — but most businesses use them wrong. Here's how to do it right.

## Size Matters

The minimum printable size for a QR code is **2cm × 2cm**. For outdoor signage, aim for at least **10cm × 10cm** so it's scannable from a distance.

## Always Use a Call to Action

Never print a QR code without telling people what happens when they scan it. Examples:
- "Scan to see the menu"
- "Scan for 20% off"
- "Scan to book a table"

## Track Everything

Use dynamic QR codes with analytics to measure:
- Total scans
- Scans by day/time
- Device type (mobile vs tablet)
- Geographic location

## Test Before You Print

Always test your QR code on multiple devices before printing. Check that it works in low light and at an angle.`,
    published: 1,
    publishedAt: new Date('2026-02-01'),
    tags: JSON.stringify(['marketing', 'best-practices', 'tips']),
  },
  {
    slug: 'how-to-add-logo-to-qr-code',
    title: 'How to Add Your Logo to a QR Code (Without Breaking It)',
    excerpt: 'Branded QR codes with logos get 80% more scans. Learn how to embed your logo while keeping the code scannable.',
    content: `# How to Add Your Logo to a QR Code

Branded QR codes with a logo in the centre get significantly more scans than plain black-and-white codes. But adding a logo incorrectly can make the code unscannable.

## How It Works

QR codes have built-in error correction. The highest level (**Level H**) can recover up to **30% of damaged data**. This is what makes it possible to place a logo in the centre without breaking the code.

## Rules for Logo Placement

1. **Keep the logo under 30% of the QR code area** — larger logos will break scannability
2. **Use high error correction** — always use Level H when adding a logo
3. **Maintain contrast** — ensure the logo background doesn't blend with the QR modules
4. **Test on multiple devices** — always verify scannability after adding a logo

## QR Studio Logo Embedding

QR Studio supports logo upload directly in the generator. Upload any PNG or SVG and the system automatically applies Level H error correction.`,
    published: 1,
    publishedAt: new Date('2026-02-20'),
    tags: JSON.stringify(['logo', 'design', 'branding']),
  },
  {
    slug: 'qr-code-analytics-what-to-track',
    title: 'QR Code Analytics: What to Track and Why It Matters',
    excerpt: 'Scan counts are just the beginning. Learn how to use QR code analytics to improve your campaigns.',
    content: `# QR Code Analytics: What to Track and Why It Matters

Most people look at total scan count and call it a day. But QR code analytics can tell you much more — if you know what to look for.

## Key Metrics to Track

### 1. Scans Over Time
Identify peak days and times. If a restaurant QR code gets 80% of scans on Friday evenings, that's valuable data for staffing and promotions.

### 2. Device Type
Are your customers scanning on mobile or tablet? This affects how you should optimise your landing page.

### 3. Geographic Distribution
If you're running a national campaign, geographic data shows which regions are most engaged.

### 4. Scan-to-Conversion Rate
Combine QR analytics with your website analytics to calculate how many scans turn into sales or sign-ups.

## Setting Up Analytics with QR Studio

1. Create a dynamic QR code in QR Studio
2. Navigate to your Dashboard
3. Click on any QR code to view its analytics
4. Export data as CSV for deeper analysis`,
    published: 1,
    publishedAt: new Date('2026-03-05'),
    tags: JSON.stringify(['analytics', 'tracking', 'data']),
  },
  {
    slug: 'how-to-create-wifi-qr-code',
    title: 'How to Create a Wi-Fi QR Code for Your Business',
    excerpt: 'Let customers connect to your Wi-Fi instantly — no password typing required. Here\'s how to create a Wi-Fi QR code.',
    content: `# How to Create a Wi-Fi QR Code for Your Business

Typing a Wi-Fi password is frustrating. A Wi-Fi QR code lets customers connect instantly — just scan and connect.

## What a Wi-Fi QR Code Contains

A Wi-Fi QR code encodes the network name (SSID), password, and security type in a standard format that both iOS and Android can read natively.

Format: \`WIFI:T:WPA;S:NetworkName;P:Password;;\`

## Step-by-Step: Create a Wi-Fi QR Code in QR Studio

1. Go to [QR Studio](/)
2. Select the **Wi-Fi** tab
3. Enter your network name (SSID)
4. Enter your Wi-Fi password
5. Select security type (WPA2 is most common)
6. Click **Generate QR Code**
7. Download as PNG or SVG

## Where to Place It

- At the entrance of your café or restaurant
- On tables as a tent card
- In hotel rooms
- At reception desks

## Security Note

Anyone who scans the code will get your Wi-Fi password. Use a separate guest network with limited bandwidth for public QR codes.`,
    published: 1,
    publishedAt: new Date('2026-03-20'),
    tags: JSON.stringify(['wifi', 'tutorial', 'business']),
  },
  {
    slug: 'vcard-qr-codes-modern-business-card',
    title: 'vCard QR Codes: The Modern Business Card',
    excerpt: 'Replace paper business cards with a scannable vCard QR code. Everything you need to know.',
    content: `# vCard QR Codes: The Modern Business Card

Paper business cards get lost. A vCard QR code lets people save your contact details directly to their phone in seconds.

## What Is a vCard QR Code?

A vCard QR code encodes your contact information in the standard vCard format (VCF). When scanned, the phone offers to save it as a new contact — no typing required.

## What You Can Include

- Full name
- Job title and company
- Phone number(s)
- Email address
- Website URL
- Physical address
- Social media profiles

## Creating a vCard QR Code in QR Studio

1. Select the **vCard** tab in QR Studio
2. Fill in your contact details
3. Customise the colours to match your brand
4. Add your company logo
5. Download and print

## Best Practices

- **Keep it current** — Use a dynamic vCard QR code so you can update details without reprinting
- **Add to email signature** — Include your QR code in your email footer
- **Print on business cards** — A QR code alongside traditional details gives people options`,
    published: 1,
    publishedAt: new Date('2026-04-01'),
    tags: JSON.stringify(['vcard', 'business-card', 'networking']),
  },
];

let inserted = 0;
for (const post of posts) {
  try {
    await conn.query(
      `INSERT INTO blog_posts (slug, title, excerpt, content, published, publishedAt, tags, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
       ON DUPLICATE KEY UPDATE title=VALUES(title), published=VALUES(published)`,
      [post.slug, post.title, post.excerpt, post.content, post.published, post.publishedAt, post.tags]
    );
    inserted++;
    console.log(`✓ Seeded: ${post.title}`);
  } catch (e) {
    console.error(`✗ Failed: ${post.title} — ${e.message}`);
  }
}

const [rows] = await conn.query("SELECT id, slug, published FROM blog_posts");
console.log(`\nDatabase now has ${rows.length} blog posts.`);
await conn.end();

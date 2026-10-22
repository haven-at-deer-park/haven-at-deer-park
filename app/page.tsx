import type { Metadata } from 'next';
import Index from '@/views/Index';

export const metadata: Metadata = {
  title: 'The Haven at Deer Park | Nature Sanctuary & Deerpark Lodge in Vernon, BC',
  description: 'Welcome to Our Haven Nature Sanctuary and Deerpark Lodge in Vernon, BC. A tranquil haven park retreat offering luxury accommodations, private hot tub, and scenic mountain lake views for up to 20 guests.',
  keywords: [
    'our haven nature sanctuary',
    'deerpark lodge',
    'deer park lodge',
    'haven parks',
    'The Haven at Deer Park',
    'Vernon vacation rental',
    'Okanagan lodge retreat',
  ],
  alternates: {
    canonical: 'https://havenatdeerpark.com',
  },
  openGraph: {
    title: 'The Haven at Deer Park | Nature Sanctuary & Deerpark Lodge in Vernon, BC',
    description: 'Welcome to Our Haven Nature Sanctuary and Deerpark Lodge in Vernon, BC. A tranquil haven park retreat offering luxury accommodations, private hot tub, and scenic mountain lake views for up to 20 guests.',
    url: 'https://havenatdeerpark.com',
  },
};

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'LodgingBusiness',
  name: 'The Haven at Deer Park',
  alternateName: [
    'Our Haven Nature Sanctuary',
    'Deerpark Lodge',
    'Deer Park Lodge',
    'The Haven Deer Park Lodge',
    'Haven Parks Nature Sanctuary',
  ],
  description: 'Luxury countryside retreat, nature sanctuary, and mountain lodge in Vernon, BC offering peaceful accommodations, hot tub, media room, and private suites for up to 20 guests.',
  url: 'https://havenatdeerpark.com',
  telephone: '+1-778-773-9915',
  email: 'info@havenatdeerpark.com',
  address: {
    '@type': 'PostalAddress',
    streetAddress: 'Tronson Road',
    addressLocality: 'Vernon',
    addressRegion: 'BC',
    postalCode: 'V1H1E2',
    addressCountry: 'CA',
  },
  amenityFeature: [
    { '@type': 'LocationFeatureSpecification', name: 'Outdoor Hot Tub', value: true },
    { '@type': 'LocationFeatureSpecification', name: 'Free High-Speed Wi-Fi', value: true },
    { '@type': 'LocationFeatureSpecification', name: 'Mountain & Lake Views', value: true },
    { '@type': 'LocationFeatureSpecification', name: 'Entertainment Room with 3D LED Walkway', value: true },
    { '@type': 'LocationFeatureSpecification', name: 'Full Kitchens', value: true },
    { '@type': 'LocationFeatureSpecification', name: 'Nature Sanctuary Trails', value: true },
  ],
  numberOfRooms: 4,
  maximumAttendeeCapacity: 20,
};

export default function Home() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <Index />
    </>
  );
}

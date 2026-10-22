import type { Metadata } from 'next';
import Gallery from '@/views/Gallery';

export const metadata: Metadata = {
  title: 'Photo Gallery',
  description: 'Browse photos of The Haven at Deer Park in Vernon, BC. View our luxury suites, modern kitchens, private hot tub, media room, and stunning Okanagan Valley scenery.',
  alternates: {
    canonical: 'https://havenatdeerpark.com/gallery',
  },
};

export default function GalleryPage() {
  return <Gallery />;
}

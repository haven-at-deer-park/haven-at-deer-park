'use client';

import { useEffect, useState } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/contexts/LanguageContext";

// Sample gallery images
const galleryImages = [
  {
    id: 1,
    src: "/images/ad5dc1b4-1fd6-4709-b15d-9f38ecec3849.png",
    alt: "The Haven at Deer Park exterior view with expansive grounds",
    category: "exterior"
  },
  {
    id: 2,
    src: "/images/5faf3e19-02d0-4534-9cd8-1349e3022106.png",
    alt: "Aerial view of The Haven with Okanagan Lake and mountains",
    category: "exterior"
  },
  {
    id: 3,
    src: "/images/a4c98456-f192-49de-b118-44ecb7d59797.png",
    alt: "Stunning aerial perspective of lakefront property",
    category: "exterior"
  },
  {
    id: 4,
    src: "/images/9de6292a-face-42e4-89d6-e0b33c7bb57a.png",
    alt: "Panoramic aerial view of The Haven at Deer Park",
    category: "exterior"
  },
  {
    id: 5,
    src: "/images/07b8e9d9-02ae-4b74-b563-703629a5958d.png",
    alt: "The Haven nestled in the mountain landscape",
    category: "exterior"
  },
  {
    id: 6,
    src: "/images/3ef6bf00-1035-499d-ba5a-42ec81f3289f.png",
    alt: "Property exterior with outdoor patio and landscaping",
    category: "exterior"
  },
  {
    id: 7,
    src: "/images/8a973e44-6d59-4ead-bb67-58d95af90b4b.png",
    alt: "Full facade view of The Haven building with hot tub area",
    category: "exterior"
  },
  {
    id: 8,
    src: "/images/94de21ce-0019-4c33-91c1-9c98b019426e.png",
    alt: "The Haven exterior showing covered patio and outdoor amenities",
    category: "exterior"
  },
  {
    id: 9,
    src: "/images/0d19ea29-cfae-4399-83de-a8c740508f32.png",
    alt: "Tennis/sports court surrounded by autumn foliage",
    category: "amenities"
  },
  {
    id: 10,
    src: "/images/bdcf3b99-9cd8-49d9-bb40-df50904a4ccf.png",
    alt: "Outdoor hot tub area with covered patio and landscaping",
    category: "amenities"
  },
  {
    id: 11,
    src: "/images/c99a0066-546d-4352-b871-79926026ba23.png",
    alt: "Covered dining area with wooden picnic tables",
    category: "amenities"
  },
  {
    id: 12,
    src: "/images/c62efe57-aee7-48c8-9ca8-89968abeef98.png",
    alt: "Hot tub under covered structure with mountain views",
    category: "amenities"
  },
  {
    id: 13,
    src: "/images/6568aeef-f611-4f72-a3ed-eeccd879ae42.png",
    alt: "Luxury hot tub with outdoor dining and relaxation area",
    category: "amenities"
  },
  {
    id: 14,
    src: "/images/50808d91-634b-4be9-9f9f-23bd106c20d6.png",
    alt: "Close-up view of hot tub with beautiful natural surroundings",
    category: "amenities"
  },
  {
    id: 15,
    src: "/images/423d3fce-9f6f-4b3b-b63a-1c10f6e26806.png",
    alt: "Hot tub relaxation area with scenic mountain backdrop",
    category: "amenities"
  },
  {
    id: 16,
    src: "/images/72c4929c-81a4-407e-a606-706d82117129.png",
    alt: "Colorful outdoor dining area with vibrant picnic tables",
    category: "amenities"
  },
  {
    id: 17,
    src: "/images/49f1f45a-4fc2-4fde-abb4-1c1641d2db10.png",
    alt: "Exterior walkway with beautiful landscaping and stepping stones",
    category: "amenities"
  },
  {
    id: 18,
    src: "/images/a5cb339c-6b01-4ba5-ba12-e65ce3156c74.png",
    alt: "Beautiful landscape view with autumn foliage and mountain backdrop",
    category: "exterior"
  },
  {
    id: 19,
    src: "/images/6f325914-e2d3-4242-983e-657a4855c302.png",
    alt: "Aerial view of The Haven showing tennis court and lake views",
    category: "exterior"
  },
  {
    id: 20,
    src: "/images/bfd9760f-bfcd-4a4c-8d62-f4368ea2d969.png",
    alt: "Stunning aerial perspective with Okanagan Lake and mountain views",
    category: "exterior"
  },
  {
    id: 21,
    src: "/images/8b8aa90b-3ad6-4fbf-be04-5a7725dbb0e4.png",
    alt: "Ground level view of The Haven building with outdoor amenities",
    category: "exterior"
  },
  {
    id: 22,
    src: "/images/d5b1a221-67a8-4030-8ca9-8c7281d77054.png",
    alt: "Property exterior showcasing beautiful landscaping and grounds",
    category: "exterior"
  },
  {
    id: 23,
    src: "/images/22d282d7-7533-46be-8972-01c716d28526.png",
    alt: "The Haven building with landscaped outdoor areas and walkways",
    category: "exterior"
  },
  {
    id: 24,
    src: "/images/ba87a842-d428-45c0-87b7-484d1d6a6adc.png",
    alt: "Front view of building with covered patio and outdoor dining areas",
    category: "exterior"
  },
  {
    id: 25,
    src: "/images/607521dc-f92d-49cf-b143-c4a4e23cc197.png",
    alt: "Building exterior with green lawns and natural landscaping",
    category: "exterior"
  },
  {
    id: 26,
    src: "/images/DSC00076hdr.JPG",
    alt: "Suite interior view",
    category: "rooms"
  },
  {
    id: 27,
    src: "/images/DSC00081hdr.JPG",
    alt: "Suite interior view",
    category: "rooms"
  },
  {
    id: 28,
    src: "/images/DSC00086hdr.JPG",
    alt: "Suite interior view",
    category: "rooms"
  },
  {
    id: 29,
    src: "/images/DSC00096hdr.JPG",
    alt: "Suite interior view",
    category: "rooms"
  },
  {
    id: 30,
    src: "/images/DSC00101hdr.JPG",
    alt: "Suite interior view",
    category: "rooms"
  },
  {
    id: 31,
    src: "/images/DSC00106hdr.JPG",
    alt: "Suite interior view",
    category: "rooms"
  },
  {
    id: 32,
    src: "/images/DSC00111hdr.JPG",
    alt: "Suite interior view",
    category: "rooms"
  },
  {
    id: 33,
    src: "/images/DSC00116hdr.JPG",
    alt: "Suite interior view",
    category: "rooms"
  },
  {
    id: 34,
    src: "/images/DSC00121hdr.JPG",
    alt: "Suite interior view",
    category: "rooms"
  },
  {
    id: 35,
    src: "/images/DSC00126hdr.JPG",
    alt: "Game room with arcade machines",
    category: "rooms"
  },
  {
    id: 36,
    src: "/images/DSC00132.JPG",
    alt: "Entertainment room with LED floor lighting",
    category: "rooms"
  },
  {
    id: 37,
    src: "/images/DSC00134hdr.JPG",
    alt: "Suite bedroom with bunk beds",
    category: "rooms"
  },
  {
    id: 38,
    src: "/images/DSC00139hdr.JPG",
    alt: "Suite bedroom with multiple beds",
    category: "rooms"
  },
  {
    id: 39,
    src: "/images/DSC00144hdr.JPG",
    alt: "Suite bedroom interior",
    category: "rooms"
  },
  {
    id: 40,
    src: "/images/DSC00149hdr.JPG",
    alt: "Suite bedroom with mountain views",
    category: "rooms"
  },
  {
    id: 41,
    src: "/images/DSC00154hdr.JPG",
    alt: "Suite balcony with mountain views",
    category: "rooms"
  },
  {
    id: 42,
    src: "/images/DSC00159hdr.JPG",
    alt: "Private balcony with outdoor seating",
    category: "rooms"
  },
  {
    id: 43,
    src: "/images/DSC00164hdr.JPG",
    alt: "Balcony view overlooking property grounds",
    category: "rooms"
  },
  {
    id: 44,
    src: "/images/DSC00169hdr.JPG",
    alt: "Suite balcony with panoramic mountain and property views",
    category: "rooms"
  },
  {
    id: 45,
    src: "/images/DSC00174hdr.JPG",
    alt: "Outdoor balcony seating area with scenic views",
    category: "rooms"
  }
];

export default function Gallery() {
  const { t } = useLanguage();
  const [selectedImage, setSelectedImage] = useState<number | null>(null);
  
  useEffect(() => {
    // Scroll to top when component mounts
    window.scrollTo(0, 0);
  }, []);
  
  // Handle lightbox navigation
  const navigateGallery = (direction: "prev" | "next") => {
    if (selectedImage === null) return;
    
    const currentIndex = galleryImages.findIndex(img => img.id === selectedImage);
    let newIndex;
    
    if (direction === "prev") {
      newIndex = currentIndex > 0 ? currentIndex - 1 : galleryImages.length - 1;
    } else {
      newIndex = currentIndex < galleryImages.length - 1 ? currentIndex + 1 : 0;
    }
    
    setSelectedImage(galleryImages[newIndex].id);
  };
  
  // Handle keyboard navigation for lightbox
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (selectedImage === null) return;
      
      if (e.key === "Escape") {
        setSelectedImage(null);
      } else if (e.key === "ArrowLeft") {
        navigateGallery("prev");
      } else if (e.key === "ArrowRight") {
        navigateGallery("next");
      }
    };
    
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedImage]);
  
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      
      <main className="flex-1 pt-20">
        {/* Header Section */}
        <section className="relative py-20 bg-gradient-to-r from-sea-light to-white dark:from-sea-dark dark:to-background overflow-hidden">
          <div className="container relative z-10">
            <div className="max-w-3xl mx-auto text-center animate-fade-in">
              <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4">
                {t.gallery.title}
              </h1>
              <p className="text-muted-foreground text-lg mb-6">
                {t.gallery.subtitle}
              </p>
            </div>
          </div>
          
          {/* Decorative elements */}
          <div className="absolute top-0 right-0 w-1/3 h-full opacity-10">
            <div className="absolute top-10 right-10 w-64 h-64 rounded-full bg-primary/50 blur-3xl" />
            <div className="absolute bottom-10 right-40 w-48 h-48 rounded-full bg-sea-light blur-3xl" />
          </div>
        </section>
        
        {/* Gallery Grid */}
        <section className="py-8">
          <div className="container">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {galleryImages.map((image, index) => (
                <div 
                  key={image.id} 
                  className="relative overflow-hidden rounded-xl aspect-[4/3] cursor-pointer group animate-fade-in"
                  style={{ animationDelay: `${index * 50}ms` }}
                  onClick={() => setSelectedImage(image.id)}
                >
                  <img 
                    src={image.src} 
                    alt={image.alt}
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end p-4">
                    <p className="text-white">{image.alt}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
        
        {/* Lightbox */}
        {selectedImage !== null && (
          <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4 animate-fade-in">
            <button 
              className="absolute top-4 right-4 text-white p-2 rounded-full hover:bg-white/10 transition-colors"
              onClick={() => setSelectedImage(null)}
            >
              <X className="h-6 w-6" />
              <span className="sr-only">Close</span>
            </button>
            
            <button 
              className="absolute left-4 top-1/2 -translate-y-1/2 text-white p-4 rounded-full hover:bg-white/10 transition-colors"
              onClick={() => navigateGallery("prev")}
            >
              <span className="sr-only">Previous</span>
              <svg className="h-8 w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            
            <div className="max-w-5xl max-h-[80vh] overflow-hidden">
              {galleryImages.find(img => img.id === selectedImage) && (
                <img 
                  src={galleryImages.find(img => img.id === selectedImage)?.src} 
                  alt={galleryImages.find(img => img.id === selectedImage)?.alt}
                  className="max-w-full max-h-[80vh] object-contain"
                />
              )}
            </div>
            
            <button 
              className="absolute right-4 top-1/2 -translate-y-1/2 text-white p-4 rounded-full hover:bg-white/10 transition-colors"
              onClick={() => navigateGallery("next")}
            >
              <span className="sr-only">Next</span>
              <svg className="h-8 w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        )}
      </main>
      
      <Footer />
    </div>
  );
}

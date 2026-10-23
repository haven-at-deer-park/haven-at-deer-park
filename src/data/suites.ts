import type { ApartmentProps } from "@/components/ApartmentCard";

// Single source of truth for the bookable suites (used by the homepage and /booking).
export const suites: ApartmentProps[] = [
  {
    id: "1",
    name: "7 person accommodations",
    description: "2 bedroom + 2 bathroom + kitchen suite with modern amenities and mountain views.",
    price: 275,
    capacity: 7,
    size: 950,
    image: "/images/7-person-kitchen.jpg",
    location: "Mountain View",
    features: ["Wi-Fi", "Full Kitchen", "2 Bathrooms", "Air Conditioning", "Smart TV", "Private Entrance"],
    externalLink: "https://www.airbnb.com/l/aM4JIC4O"
  },
  {
    id: "2",
    name: "12 person accommodations",
    description: "2 bedroom + 3 bathroom + kitchen + media room/guest suite + walkout patio.",
    price: 550,
    capacity: 12,
    size: 1600,
    image: "/images/12-person-balcony.jpg",
    location: "Mountain View",
    features: ["Wi-Fi", "Full Kitchen", "3 Bathrooms", "Media Room", "Walkout Patio", "Laundry Facilities"],
    externalLink: "https://www.airbnb.com/l/17ciaUP9"
  },
  {
    id: "3",
    name: "Entire Place",
    description: "4 bedrooms + 5 bathrooms + 2 kitchens + media room/guest suite + walkout patio.",
    price: 995,
    capacity: 20,
    size: 4000,
    image: "/images/entire-place-exterior.jpg",
    location: "Full Property",
    features: ["Wi-Fi", "2 Full Kitchens", "5 Bathrooms", "Hot Tub", "Media Room", "Entertainment Center"],
    externalLink: "https://www.airbnb.com/l/ZiLcS9MN"
  }
];

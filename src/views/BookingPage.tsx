'use client';

import Link from "next/link";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { suites } from "@/data/suites";
import { trackAirbnbClick, getSuiteFromUrl } from "@/hooks/useAnalytics";
import {
  Users,
  Maximize,
  Check,
  ArrowRight,
  CalendarCheck,
  ShieldCheck,
  Bus,
  MapPin,
  Phone,
  Mail,
} from "lucide-react";

const suiteDetails: Record<string, { heading: string; summary: string; idealFor: string }> = {
  "1": {
    heading: "7-Person Suite",
    summary:
      "Our 7-person suite has 2 bedrooms, 2 bathrooms and a full kitchen, with modern amenities and mountain views. It has its own private entrance, air conditioning and a smart TV, so a smaller group can settle in with everything they need.",
    idealFor: "Families, couples travelling together, and small groups of friends.",
  },
  "2": {
    heading: "12-Person Suite",
    summary:
      "The 12-person suite adds space for larger groups: 2 bedrooms, 3 bathrooms, a full kitchen, plus a media room that doubles as a guest suite and a walkout patio. Laundry facilities are on site for longer stays.",
    idealFor: "Extended families, reunions, and groups who want room to spread out.",
  },
  "3": {
    heading: "Entire Place",
    summary:
      "Book the whole property and have The Haven at Deer Park to yourselves: 4 bedrooms, 5 bathrooms, 2 full kitchens, the media room and guest suite, the walkout patio, the outdoor hot tub and the entertainment center. It sleeps up to 20 guests.",
    idealFor: "Wellness retreats, family reunions, celebrations and group getaways of up to 20 people.",
  },
};

const benefits = [
  "Instant confirmation",
  "Family-run hospitality",
  "Flexible group arrangements",
  "Modern amenities in nature",
  "Fully permitted and insured",
  "Superhost status with a history in hospitality",
  "Transportation services for up to 20 people available",
];

export default function BookingPage() {
  const handleBookClick = (link: string, label: string) => {
    trackAirbnbClick({
      linkUrl: link,
      linkLocation: "apartment_card",
      suite: getSuiteFromUrl(link),
      linkLabel: label,
    });
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />

      <main className="flex-1 pt-20">
        {/* Header */}
        <section className="relative py-16 bg-gradient-to-r from-sea-light to-white dark:from-sea-dark dark:to-background overflow-hidden">
          <div className="container relative z-10">
            <div className="max-w-3xl mx-auto text-center animate-fade-in">
              <span className="text-sm text-primary font-medium uppercase tracking-wider">
                Booking
              </span>
              <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold mt-2 mb-4">
                Book Your Stay at The Haven at Deer Park
              </h1>
              <p className="text-muted-foreground text-lg">
                Choose the suite that fits your group, from a 7-person suite to the entire
                property for up to 20 guests, in Vernon, BC, near the western shores of
                Okanagan Lake.
              </p>
            </div>
          </div>
          <div className="absolute top-0 right-0 w-1/3 h-full opacity-10">
            <div className="absolute top-10 right-10 w-64 h-64 rounded-full bg-primary/50 blur-3xl" />
            <div className="absolute bottom-10 right-40 w-48 h-48 rounded-full bg-sea-light blur-3xl" />
          </div>
        </section>

        {/* How booking works */}
        <section className="py-16">
          <div className="container max-w-4xl">
            <h2 className="text-2xl md:text-3xl font-bold mb-6 text-center">How Booking Works</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="glass-card p-6 rounded-xl">
                <div className="mb-3 p-3 w-fit rounded-full bg-primary/10 text-primary">
                  <Users className="h-6 w-6" />
                </div>
                <h3 className="font-semibold text-lg mb-2">1. Pick your suite</h3>
                <p className="text-muted-foreground">
                  Compare the three options below by group size, bedrooms, bathrooms and
                  features.
                </p>
              </div>
              <div className="glass-card p-6 rounded-xl">
                <div className="mb-3 p-3 w-fit rounded-full bg-primary/10 text-primary">
                  <CalendarCheck className="h-6 w-6" />
                </div>
                <h3 className="font-semibold text-lg mb-2">2. Check dates on Airbnb</h3>
                <p className="text-muted-foreground">
                  Each suite links to its Airbnb listing, where you can see live availability,
                  nightly rates, house rules and the cancellation policy.
                </p>
              </div>
              <div className="glass-card p-6 rounded-xl">
                <div className="mb-3 p-3 w-fit rounded-full bg-primary/10 text-primary">
                  <ShieldCheck className="h-6 w-6" />
                </div>
                <h3 className="font-semibold text-lg mb-2">3. Reserve securely</h3>
                <p className="text-muted-foreground">
                  Complete your booking and payment through Airbnb and get instant
                  confirmation. Questions first? Contact us directly.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Suites */}
        <section className="py-16 bg-card">
          <div className="container max-w-5xl">
            <div className="text-center max-w-3xl mx-auto mb-12">
              <h2 className="text-2xl md:text-3xl font-bold mb-4">Choose Your Suite</h2>
              <p className="text-muted-foreground">
                Every option includes high-speed Wi-Fi, a fully equipped kitchen and access to
                the peaceful forest setting with lake and mountain views.
              </p>
            </div>

            <div className="space-y-10">
              {suites.map((suite) => {
                const details = suiteDetails[suite.id];
                const label = `Book ${details.heading}`;
                return (
                  <article
                    key={suite.id}
                    className="rounded-2xl overflow-hidden border border-border bg-background shadow-sm flex flex-col md:flex-row"
                  >
                    <div className="md:w-2/5 h-64 md:h-auto">
                      <img
                        src={suite.image}
                        alt={`${details.heading} at The Haven at Deer Park, Vernon BC`}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="p-6 md:p-8 flex-1 flex flex-col">
                      <h3 className="text-2xl font-bold mb-2">{details.heading}</h3>
                      <div className="flex flex-wrap gap-4 text-sm text-muted-foreground mb-4">
                        <span className="flex items-center">
                          <Users className="h-4 w-4 mr-1" /> Up to {suite.capacity} guests
                        </span>
                        <span className="flex items-center">
                          <Maximize className="h-4 w-4 mr-1" /> {suite.size.toLocaleString()} sq ft
                        </span>
                      </div>
                      <p className="text-muted-foreground mb-4">{details.summary}</p>
                      <p className="text-sm mb-4">
                        <span className="font-semibold">Ideal for:</span> {details.idealFor}
                      </p>
                      <ul className="grid grid-cols-2 gap-2 mb-6">
                        {suite.features.map((feature) => (
                          <li key={feature} className="flex items-center text-sm">
                            <Check className="h-4 w-4 mr-2 text-primary" />
                            {feature}
                          </li>
                        ))}
                      </ul>
                      <div className="mt-auto">
                        <Button asChild className="btn-primary">
                          <a
                            href={suite.externalLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={() => handleBookClick(suite.externalLink!, label)}
                            data-analytics-location="apartment_card"
                            data-suite={getSuiteFromUrl(suite.externalLink!)}
                          >
                            Check availability on Airbnb <ArrowRight className="ml-2 h-4 w-4" />
                          </a>
                        </Button>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          </div>
        </section>

        {/* Why book with us */}
        <section className="py-16">
          <div className="container max-w-4xl">
            <h2 className="text-2xl md:text-3xl font-bold mb-4 text-center">
              Why Guests Book The Haven at Deer Park
            </h2>
            <p className="text-muted-foreground text-center mb-8 max-w-2xl mx-auto">
              The Haven at Deer Park is a family-run retreat in Vernon, British Columbia,
              set among forests near Okanagan Lake. Here is what you can count on when you
              book with us.
            </p>
            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {benefits.map((benefit) => (
                <li key={benefit} className="flex items-start glass-card p-4 rounded-xl">
                  <Check className="h-5 w-5 mr-3 mt-0.5 text-primary shrink-0" />
                  <span>{benefit}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* Groups & transport */}
        <section className="py-16 bg-card">
          <div className="container max-w-4xl">
            <div className="flex items-center justify-center mb-4 text-primary">
              <Bus className="h-8 w-8" />
            </div>
            <h2 className="text-2xl md:text-3xl font-bold mb-4 text-center">
              Group Bookings and Transportation
            </h2>
            <p className="text-muted-foreground mb-4">
              Planning a wellness retreat, family reunion or group getaway? Booking the Entire
              Place gives your group of up to 20 guests the full property: every bedroom and
              bathroom, both kitchens, the media room, the hot tub and the entertainment
              center.
            </p>
            <p className="text-muted-foreground">
              We offer flexible group arrangements, and transportation services are available
              for groups of up to 20 people. Get in touch before you book and we will help you
              plan the details.
            </p>
          </div>
        </section>

        {/* Contact */}
        <section className="py-16">
          <div className="container max-w-3xl text-center">
            <h2 className="text-2xl md:text-3xl font-bold mb-4">Questions Before You Book?</h2>
            <p className="text-muted-foreground mb-8">
              We are happy to help with availability, group plans or anything else about your
              stay.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8 text-sm">
              <div className="glass-card p-4 rounded-xl flex flex-col items-center">
                <MapPin className="h-5 w-5 mb-2 text-primary" />
                Tronson Road, Vernon, BC V1H 1E2
              </div>
              <a
                href="tel:+17787739915"
                className="glass-card p-4 rounded-xl flex flex-col items-center hover:text-primary transition-colors"
              >
                <Phone className="h-5 w-5 mb-2 text-primary" />
                778-773-9915
              </a>
              <a
                href="mailto:info@havenatdeerpark.com"
                className="glass-card p-4 rounded-xl flex flex-col items-center hover:text-primary transition-colors"
              >
                <Mail className="h-5 w-5 mb-2 text-primary" />
                info@havenatdeerpark.com
              </a>
            </div>
            <Button asChild variant="outline">
              <Link href="/contact">Send us a message</Link>
            </Button>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}

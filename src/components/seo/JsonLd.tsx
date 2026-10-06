export default function JsonLd() {
  const organizationSchema = {
    '@context': 'https://schema.org',
    '@type': ['EducationalOrganization', 'ResearchOrganization'],
    name: 'Parul Innovation and Entrepreneurship Research Center',
    alternateName: ['PIERC', 'PIERC IMS', 'EDC Parul University'],
    url: 'https://portal.pierc.org',
    logo: 'https://portal.pierc.orghttps://firebasestorage.googleapis.com/v0/b/pierc-portal-9bd82.firebasestorage.app/o/logo.svg?alt=media&token=52188887-32e9-4dcf-bec6-dde7175eaa86',
    image: 'https://portal.pierc.org/og-image.png',
    description:
      'Parul Innovation & Entrepreneurship Research Centre (PIERC) is a Section 8 incubator fostering student, alumni, and faculty startups through seed funding, SSIP grants, mentorship, and acceleration at Parul University.',
    parentOrganization: {
      '@type': 'CollegeOrUniversity',
      name: 'Parul University',
      url: 'https://paruluniversity.ac.in',
    },
    address: {
      '@type': 'PostalAddress',
      streetAddress: 'P.O. Limda, Ta. Waghodia',
      addressLocality: 'Vadodara',
      addressRegion: 'Gujarat',
      postalCode: '391760',
      addressCountry: 'IN',
    },
    contactPoint: {
      '@type': 'ContactPoint',
      contactType: 'Incubation Support',
      email: 'programs.pierc@paruluniversity.ac.in',
      areaServed: 'IN',
      availableLanguage: ['English', 'Hindi', 'Gujarati'],
    },
    sameAs: [
      'https://www.pierc.org',
      'https://paruluniversity.ac.in',
      'https://www.linkedin.com/company/pierc',
    ],
  };

  const softwareSchema = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: 'PIERC Incubation Management System',
    operatingSystem: 'All Web Browsers',
    applicationCategory: 'BusinessApplication',
    url: 'https://portal.pierc.org',
    softwareVersion: '2.0',
    description:
      'Enterprise-grade incubation lifecycle management portal for startup applications, pitch reviews, milestone roadmaps, SSIP grant disbursements, and mentor evaluations.',
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'INR',
    },
    publisher: {
      '@type': 'Organization',
      name: 'Parul University - PIERC',
    },
  };

  const faqSchema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: 'What is PIERC (Parul Innovation & Entrepreneurship Research Centre)?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'PIERC is the official startup incubation center of Parul University, registered as a Section 8 company in 2015. It provides end-to-end incubation, pre-seed and seed grant funding, FabLab prototyping infrastructure, and expert mentorship to student, alumni, and faculty entrepreneurs from idea to growth stage.',
        },
      },
      {
        '@type': 'Question',
        name: 'Who can apply for startup incubation at PIERC?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Parul University students, faculty, alumni, as well as external early-stage innovators and entrepreneurs across India can apply through the PIERC Incubation Management System (portal.pierc.org). Ideas ranging from ideation to prototype and commercialization stages are welcome.',
        },
      },
      {
        '@type': 'Question',
        name: 'What grants and funding opportunities are available through PIERC?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Incubated startups can access Government of Gujarat Student Startup & Innovation Policy (SSIP 2.0) grants up to ₹2.5 Lakhs for prototyping and ₹5 Lakhs for IPR/patenting, DST NIDHI-PRAYAS grants up to ₹10 Lakhs, and institutional angel/seed capital up to ₹10–25 Lakhs per startup.',
        },
      },
      {
        '@type': 'Question',
        name: 'What facilities and startup studios does PIERC provide in Gujarat?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'PIERC operates regional Startup Studios across Vadodara, Ahmedabad, Surat, and Rajkot. Facilities include high-tech FabLabs, dedicated and flexi co-working desks, advanced 3D printing and IoT labs, meeting lounges, and legal/regulatory compliance support.',
        },
      },
      {
        '@type': 'Question',
        name: 'How does the PIERC evaluation and cohort onboarding process work?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Entrepreneurs submit their proposal on portal.pierc.org. Applications undergo Phase 1 internal screening, followed by Phase 2 pitching before an expert review panel. Selected startups enter cohorts with assigned industry mentors, milestone roadmap tracking, and tranche-based grant disbursements.',
        },
      },
    ],
  };

  const websiteSchema = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'PIERC Incubation Management System',
    url: 'https://portal.pierc.org',
    potentialAction: {
      '@type': 'SearchAction',
      target: 'https://portal.pierc.org/dashboard/startups?q={search_term_string}',
      'query-input': 'required name=search_term_string',
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(softwareSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteSchema) }}
      />
    </>
  );
}

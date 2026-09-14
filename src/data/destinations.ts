/**
 * Seed corpus for the travel-destination RAG chatbot.
 *
 * Per spec decisions 5 and 6 (spec/initialsetup.md): the object shape *is* the row shape,
 * and each named prose section becomes one independent chunk with its own embedding.
 * Sections are therefore written to be self-contained — a section is retrieved without its
 * siblings, so it names the destination itself and stays strictly on its own topic.
 */

export type BudgetTier = "budget" | "mid" | "luxury";

export type Destination = {
  /** url-safe, lowercase; primary key on `destinations` */
  slug: string;
  name: string;
  country: string;
  /** 1-12, months genuinely good to visit */
  bestMonths: number[];
  budgetTier: BudgetTier;
  /** lowercase, single words or hyphenated */
  tags: string[];
  /** one-line editorial summary; the prose sections are far too long for a card */
  tagline: string;
  /** hotlinked Unsplash photo — the host is allow-listed in next.config.ts */
  image: {
    /** the `photo-…` path segment, without query parameters */
    id: string;
    alt: string;
  };
  /** one chunk per section at ingest time */
  sections: {
    overview: string;
    food: string;
    attractions: string;
    gettingAround: string;
    whenToGo: string;
  };
};

/** Section names, derived from the shape above so the two cannot drift. */
export type SectionName = keyof Destination["sections"];

export type Chunk = {
  section: SectionName;
  content: string;
};

/** One destination -> N chunk rows. Used by POST /api/ingest. */
export const allSections = (d: Destination): Chunk[] =>
  (Object.entries(d.sections) as [SectionName, string][]).map(([section, content]) => ({
    section,
    content,
  }));

export const destinations:  Destination[] = [
  {
    slug: "varanasi",
    name: "Varanasi",
    country: "India",
    bestMonths: [10, 11, 12, 1, 2, 3],
    budgetTier: "mid",
    tags: ["hinduism", "temples", "spirituality", "ghats", "pilgrimage"],
    tagline: "The oldest living city, best met at dawn from the water.",
    image: {
      id: "photo-1627894483216-2138af692e32",
      alt: "Priests raising tiered oil lamps during the evening Ganga Aarti in Varanasi",
    },
    sections: {
      overview:
        "Varanasi, also known as Kashi or Banaras, is one of the oldest continuously inhabited cities in the world and one of Hinduism's holiest destinations. Located on the banks of the River Ganga in Uttar Pradesh, the city is famous for its ancient temples, sacred ghats and spiritual atmosphere. Hindus believe that dying in Varanasi can bring moksha, or liberation from the cycle of rebirth.",

      food:
        "Varanasi is known for kachori sabzi, tamatar chaat, baati chokha, malaiyyo during winter and the famous Banarasi paan. Street food is especially popular around Godowlia and the old city markets.",

      attractions:
        "Major attractions include Kashi Vishwanath Temple, Dashashwamedh Ghat, Assi Ghat, Manikarnika Ghat, Sankat Mochan Hanuman Temple and the evening Ganga Aarti. A sunrise boat ride on the River Ganga is one of the most popular experiences.",

      gettingAround:
        "The old city is best explored on foot because many lanes are narrow and crowded. Auto-rickshaws and taxis are useful for longer distances, while boats connect several important ghats along the River Ganga.",

      whenToGo:
        "October to March is the most comfortable period because temperatures are cooler. Dev Deepawali and festivals such as Mahashivratri attract large numbers of pilgrims and visitors.",
    },
  },

  {
    slug: "haridwar",
    name: "Haridwar",
    country: "India",
    bestMonths: [2, 3, 4, 9, 10, 11],
    budgetTier: "budget",
    tags: ["hinduism", "ganga", "pilgrimage", "temples", "spirituality"],
    tagline: "Where the Ganga leaves the mountains and the evening aarti begins.",
    image: {
      id: "photo-1724432799555-6414c4a669b9",
      alt: "Crowds gathered along the riverfront steps at Har Ki Pauri, Haridwar",
    },
    sections: {
      overview:
        "Haridwar in Uttarakhand is one of the seven sacred cities of Hinduism. The city is located where the River Ganga enters the northern plains of India. It is an important pilgrimage destination and a major center for Hindu rituals, festivals and spiritual practices.",

      food:
        "Haridwar offers vegetarian North Indian food, including aloo puri, kachori, chole and traditional sweets. Local markets near Har Ki Pauri are popular for snacks and religious offerings.",

      attractions:
        "Har Ki Pauri is the city's most famous ghat and is known for the evening Ganga Aarti. Other important places include Mansa Devi Temple, Chandi Devi Temple, Daksha Mahadev Temple and Bharat Mata Mandir.",

      gettingAround:
        "Most major religious areas can be explored by walking. Auto-rickshaws and taxis are available for longer distances, while cable cars provide access to some hilltop temples.",

      whenToGo:
        "February to April and September to November offer pleasant weather. Major festivals and religious gatherings can make the city extremely crowded.",
    },
  },

  {
    slug: "rishikesh",
    name: "Rishikesh",
    country: "India",
    bestMonths: [2, 3, 4, 9, 10, 11],
    budgetTier: "mid",
    tags: ["hinduism", "yoga", "spirituality", "ganga", "ashrams"],
    tagline: "Yoga, ashrams and white water where the Ganga runs green.",
    image: {
      id: "photo-1607406374368-809f8ec7f118",
      alt: "A white statue of Shiva meditating on a rock in the Ganga at Rishikesh",
    },
    sections: {
      overview:
        "Rishikesh is a major Hindu spiritual destination located on the banks of the River Ganga in Uttarakhand. It is famous for yoga, meditation, temples and ashrams. The city is also considered an important gateway for pilgrims travelling toward the Char Dham destinations.",

      food:
        "Vegetarian food is widely available, with many cafes serving Indian and international dishes. Traditional thalis, chai and North Indian snacks are common around the main spiritual areas.",

      attractions:
        "Important attractions include Triveni Ghat, Parmarth Niketan, Ram Jhula, Lakshman Jhula area, Neelkanth Mahadev Temple and the evening Ganga Aarti.",

      gettingAround:
        "Central Rishikesh is walkable, especially around the river and ashram areas. Auto-rickshaws and taxis are useful for travelling to temples and destinations outside the main town.",

      whenToGo:
        "February to April and September to November are generally pleasant. The monsoon season can bring heavy rainfall, while winter is cooler and suitable for spiritual retreats.",
    },
  },

  {
    slug: "ayodhya",
    name: "Ayodhya",
    country: "India",
    bestMonths: [10, 11, 12, 1, 2, 3],
    budgetTier: "mid",
    tags: ["hinduism", "ramayana", "temples", "pilgrimage", "history"],
    tagline: "The Ramayana's home town, rebuilt around its river ghats.",
    image: {
      id: "photo-1706169599121-4182eb12fbef",
      alt: "A garlanded Hindu deity surrounded by marigold flowers",
    },
    sections: {
      overview:
        "Ayodhya in Uttar Pradesh is one of Hinduism's most important sacred cities and is traditionally believed to be the birthplace of Lord Rama. The city has deep connections with the Ramayana and attracts millions of Hindu pilgrims.",

      food:
        "Ayodhya mainly offers vegetarian North Indian cuisine. Popular options include puri sabzi, kachori, chaat, sweets and traditional temple prasad.",

      attractions:
        "Major religious attractions include the Ram Mandir, Hanuman Garhi, Kanak Bhawan, Dashrath Mahal and the ghats along the Sarayu River. The evening atmosphere around the river is especially popular with pilgrims.",

      gettingAround:
        "Many important temples are located relatively close to each other and can be explored on foot. Auto-rickshaws and electric rickshaws are useful for longer distances.",

      whenToGo:
        "October to March offers comfortable weather for sightseeing and temple visits. Ram Navami and Diwali are especially important festivals but bring very large crowds.",
    },
  },

  {
    slug: "mathura",
    name: "Mathura",
    country: "India",
    bestMonths: [10, 11, 12, 1, 2, 3],
    budgetTier: "budget",
    tags: ["hinduism", "krishna", "temples", "pilgrimage", "culture"],
    tagline: "Krishna's birthplace, loudest and best during Holi.",
    image: {
      id: "photo-1697804031395-b3dc2b07b447",
      alt: "An ornate temple building with a bird perched on its carved roofline",
    },
    sections: {
      overview:
        "Mathura in Uttar Pradesh is traditionally considered the birthplace of Lord Krishna and is one of the most important pilgrimage destinations for Krishna devotees. The city has strong connections to Hindu mythology and the stories of Krishna's childhood.",

      food:
        "Mathura is famous for peda, milk-based sweets and vegetarian North Indian food. Local markets offer kachori, jalebi, lassi and traditional snacks.",

      attractions:
        "Important places include Shri Krishna Janmabhoomi Temple, Dwarkadhish Temple, Vishram Ghat and nearby Vrindavan temples. Visitors often combine Mathura and Vrindavan in one trip.",

      gettingAround:
        "Auto-rickshaws and e-rickshaws are common for local transportation. Temple areas can often be explored on foot, although traffic can be heavy during festivals.",

      whenToGo:
        "October to March provides the most comfortable weather. Janmashtami and Holi are major celebrations and attract large crowds from across India.",
    },
  },

  {
    slug: "vrindavan",
    name: "Vrindavan",
    country: "India",
    bestMonths: [10, 11, 12, 1, 2, 3],
    budgetTier: "budget",
    tags: ["hinduism", "krishna", "bhakti", "temples", "pilgrimage"],
    tagline: "A thousand temples, and colour thrown in every lane.",
    image: {
      id: "photo-1742022165140-d890e51ae33b",
      alt: "People throwing coloured powder while celebrating Holi at a temple in Vrindavan",
    },
    sections: {
      overview:
        "Vrindavan is one of the holiest destinations associated with Lord Krishna. Located near Mathura in Uttar Pradesh, the town is traditionally connected with Krishna's childhood and his stories with Radha and the gopis.",

      food:
        "Vegetarian food dominates Vrindavan, with temple prasad, traditional thalis, sweets and milk-based dishes widely available. Many visitors also enjoy local peda and lassi.",

      attractions:
        "Major attractions include Banke Bihari Temple, ISKCON Temple, Prem Mandir, Radha Raman Temple and Radha Vallabh Temple. Evening prayers and devotional singing are central experiences.",

      gettingAround:
        "The temple areas are best explored on foot or by e-rickshaw. Roads can become crowded during weekends and major religious festivals.",

      whenToGo:
        "October to March is generally the best period because of pleasant weather. Holi is one of the most famous celebrations but the town becomes extremely crowded.",
    },
  },

  {
    slug: "tirupati",
    name: "Tirupati",
    country: "India",
    bestMonths: [9, 10, 11, 12, 1, 2],
    budgetTier: "mid",
    tags: ["hinduism", "balaji", "temples", "pilgrimage", "south-india"],
    tagline: "The hill shrine that draws more pilgrims than almost anywhere.",
    image: {
      id: "photo-1733805569204-41768c7d8c0f",
      alt: "The illuminated gopuram of the Venkateswara temple at night in Tirupati",
    },
    sections: {
      overview:
        "Tirupati in Andhra Pradesh is home to the famous Tirumala Venkateswara Temple, dedicated to Lord Venkateswara, a form of Vishnu. It is one of the most visited Hindu pilgrimage destinations in India.",

      food:
        "South Indian vegetarian food is widely available, including idli, dosa, vada and traditional meals. Tirupati laddu is the most famous temple prasad associated with the destination.",

      attractions:
        "The Tirumala Venkateswara Temple is the main attraction. Other important places include Sri Padmavathi Ammavari Temple, Kapila Theertham and several religious sites in the surrounding hills.",

      gettingAround:
        "Buses and taxis connect Tirupati city with Tirumala Hills. Within the pilgrimage area, organized transport and walking routes help visitors move between important locations.",

      whenToGo:
        "September to February generally offers more comfortable weather. Major Hindu festivals and holidays can significantly increase waiting times for temple दर्शन.",
    },
  },

  {
    slug: "puri",
    name: "Puri",
    country: "India",
    bestMonths: [10, 11, 12, 1, 2, 3],
    budgetTier: "mid",
    tags: ["hinduism", "jagannath", "temples", "pilgrimage", "beach"],
    tagline: "Jagannath's temple town, with a long beach behind it.",
    image: {
      id: "photo-1706790574525-d218c4c52b5c",
      alt: "The Jagannath Temple in Puri decorated with flowers and garlands",
    },
    sections: {
      overview:
        "Puri in Odisha is one of the Char Dham pilgrimage destinations in Hinduism. The city is famous for the Jagannath Temple, dedicated to Lord Jagannath, along with Balabhadra and Subhadra.",

      food:
        "Puri is known for the traditional Mahaprasad served through the Jagannath Temple tradition. Visitors can also enjoy Odia cuisine, vegetarian meals and local sweets.",

      attractions:
        "The Jagannath Temple is the main religious attraction. Puri Beach, Gundicha Temple and nearby Konark are also popular places for visitors exploring the region.",

      gettingAround:
        "Auto-rickshaws, cycle-rickshaws and taxis are commonly used for local travel. The main temple and market areas are convenient to explore on foot.",

      whenToGo:
        "October to March offers pleasant weather. The annual Rath Yatra is the city's most famous festival and attracts enormous crowds.",
    },
  },

  {
    slug: "dwarka",
    name: "Dwarka",
    country: "India",
    bestMonths: [10, 11, 12, 1, 2, 3],
    budgetTier: "mid",
    tags: ["hinduism", "krishna", "char-dham", "temples", "pilgrimage"],
    tagline: "Krishna's coastal capital at the western edge of Gujarat.",
    image: {
      id: "photo-1717326630799-703fe906e283",
      alt: "The tall flag-topped spire of the Dwarkadhish temple against a clear sky",
    },
    sections: {
      overview:
        "Dwarka in Gujarat is one of the four major Char Dham pilgrimage destinations and is strongly associated with Lord Krishna. Hindu tradition describes Dwarka as the ancient kingdom established by Krishna after leaving Mathura.",

      food:
        "Vegetarian Gujarati food is widely available, including thalis, farsan, khichdi and traditional sweets. Temple areas also offer religious prasad and simple vegetarian meals.",

      attractions:
        "Dwarkadhish Temple is the main attraction. Other important places include Bet Dwarka, Rukmini Devi Temple, Gomti Ghat and Nageshwar Jyotirlinga nearby.",

      gettingAround:
        "The central temple area can be explored on foot. Auto-rickshaws and taxis are useful for visiting Rukmini Temple, Nageshwar and other nearby religious destinations.",

      whenToGo:
        "October to March is generally the most comfortable period because the weather is cooler. Janmashtami is an important celebration and attracts many Krishna devotees.",
    },
  },

  {
    slug: "somnath",
    name: "Somnath",
    country: "India",
    bestMonths: [10, 11, 12, 1, 2, 3],
    budgetTier: "mid",
    tags: ["hinduism", "shiva", "jyotirlinga", "temples", "pilgrimage"],
    tagline: "A jyotirlinga rebuilt many times, facing the Arabian Sea.",
    image: {
      id: "photo-1735192683815-d8918aad53dc",
      alt: "The carved sandstone shikhara of a Hindu temple against a clear sky",
    },
    sections: {
      overview:
        "Somnath in Gujarat is one of the most important Hindu pilgrimage destinations and is home to the Somnath Temple, dedicated to Lord Shiva. The temple is traditionally considered the first of the twelve Jyotirlingas.",

      food:
        "Visitors can find Gujarati vegetarian food, traditional thalis, snacks and sweets throughout the town. Simple vegetarian meals are also widely available near the temple area.",

      attractions:
        "The Somnath Temple is the primary attraction. Other nearby places include Triveni Sangam, Bhalka Tirth, Gita Mandir and the coastal areas around Veraval.",

      gettingAround:
        "Auto-rickshaws and taxis are convenient for visiting attractions around Somnath. The main temple area and nearby promenade can be comfortably explored on foot.",

      whenToGo:
        "October to March provides pleasant weather for visiting the temple and coastal attractions. Mahashivratri is one of the most important religious periods for devotees.",
    },
  },
    {
    slug: "udaipur",
    name: "Udaipur",
    country: "India",
    bestMonths: [10, 11, 12, 1, 2, 3],
    budgetTier: "mid",
    tags: ["lakes", "palaces", "heritage", "romantic", "rajasthan"],
    tagline: "Palaces on Lake Pichola, at their best in the last hour of light.",
    image: {
      id: "photo-1695956353120-54ce5e91632b",
      alt: "The City Palace on the banks of Lake Pichola in Udaipur at golden hour",
    },
    sections: {
      overview:
        "Udaipur in Rajasthan is known as the City of Lakes and is famous for its beautiful lakes, royal palaces and historic architecture. The city offers a combination of Rajput heritage, scenic views and traditional Rajasthani culture.",

      food:
        "Udaipur offers traditional Rajasthani cuisine including dal baati churma, gatte ki sabzi, kachori and local sweets. Many restaurants around Lake Pichola also offer rooftop dining with views of the city's lakes and palaces.",

      attractions:
        "Major attractions include City Palace, Lake Pichola, Jag Mandir, Sajjangarh Palace, Fateh Sagar Lake, Saheliyon Ki Bari and Bagore Ki Haveli.",

      gettingAround:
        "The old city is best explored on foot because many attractions are located close together. Auto-rickshaws, taxis and app-based cabs are useful for travelling to places farther from the city center.",

      whenToGo:
        "October to March is the best period to visit Udaipur because temperatures are more comfortable for sightseeing. Summers can be extremely hot."
    },
  },

  {
    slug: "jodhpur",
    name: "Jodhpur",
    country: "India",
    bestMonths: [10, 11, 12, 1, 2, 3],
    budgetTier: "mid",
    tags: ["forts", "heritage", "blue-city", "rajasthan", "culture"],
    tagline: "A blue old city stacked beneath one enormous fort.",
    image: {
      id: "photo-1686825780583-8be7c349a4b4",
      alt: "Densely packed blue-painted houses in the old city of Jodhpur",
    },
    sections: {
      overview:
        "Jodhpur in Rajasthan is popularly known as the Blue City because of the blue-painted houses surrounding its historic center. The city is famous for Rajput architecture, massive forts, desert culture and traditional markets.",

      food:
        "Jodhpur is known for Rajasthani dishes such as mirchi vada, pyaaz kachori, dal baati churma and mawa kachori. Local markets offer a wide variety of traditional snacks and sweets.",

      attractions:
        "Major attractions include Mehrangarh Fort, Jaswant Thada, Umaid Bhawan Palace, Mandore Gardens and the historic blue streets around the old city.",

      gettingAround:
        "The old city and areas around Mehrangarh Fort can be explored by walking. Auto-rickshaws, taxis and app-based transport are useful for longer distances.",

      whenToGo:
        "October to March offers the most comfortable weather for exploring Jodhpur. Summers are extremely hot and are less suitable for outdoor sightseeing."
    },
  },

  {
    slug: "jaipur",
    name: "Jaipur",
    country: "India",
    bestMonths: [10, 11, 12, 1, 2, 3],
    budgetTier: "mid",
    tags: ["palaces", "forts", "heritage", "shopping", "rajasthan"],
    tagline: "Pink sandstone, hill forts and the best bazaars in Rajasthan.",
    image: {
      id: "photo-1706961121783-4ae6c933983a",
      alt: "The honeycombed pink sandstone facade of the Hawa Mahal in Jaipur",
    },
    sections: {
      overview:
        "Jaipur, the capital of Rajasthan, is known as the Pink City and is one of India's most popular heritage destinations. It is famous for royal palaces, historic forts, colorful markets and traditional Rajasthani culture.",

      food:
        "Jaipur offers popular Rajasthani food including dal baati churma, laal maas, kachori, ghewar and traditional sweets. The city also has many cafes and restaurants serving modern Indian and international food.",

      attractions:
        "Major attractions include Amber Fort, City Palace, Hawa Mahal, Jantar Mantar, Nahargarh Fort, Jal Mahal and the colorful markets of the old city.",

      gettingAround:
        "Auto-rickshaws, taxis, app-based cabs and the Jaipur Metro are available for local transportation. Hiring a taxi can be convenient for visiting forts located outside the central city.",

      whenToGo:
        "October to March is the best time to visit because the weather is cooler and suitable for sightseeing. Summers can be very hot."
    },
  },

  {
    slug: "bhopal",
    name: "Bhopal",
    country: "India",
    bestMonths: [10, 11, 12, 1, 2, 3],
    budgetTier: "budget",
    tags: ["lakes", "history", "madhya-pradesh", "culture", "museums"],
    tagline: "Two lakes, Bhimbetka's rock art, and quiet museums.",
    image: {
      id: "photo-1687900285964-6c0e92bd5a5a",
      alt: "Small boats moored on the Upper Lake at Bhopal",
    },
    sections: {
      overview:
        "Bhopal, the capital of Madhya Pradesh, is known for its lakes, historical architecture and mixture of old and modern culture. The city is also a useful base for exploring several important historical and natural destinations nearby.",

      food:
        "Bhopal is known for poha, jalebi, kebabs, biryani and a variety of Madhya Pradesh street food. Traditional markets and local restaurants offer both vegetarian and non-vegetarian cuisine.",

      attractions:
        "Major attractions include Upper Lake, Lower Lake, Taj-ul-Masajid, Bharat Bhavan and the nearby Bhimbetka Rock Shelters and Sanchi monuments.",

      gettingAround:
        "Auto-rickshaws, taxis and app-based cabs are useful for travelling around Bhopal. Private transport is convenient for visiting destinations such as Sanchi and Bhimbetka outside the city.",

      whenToGo:
        "October to March offers pleasant weather for sightseeing. Summers can become very hot, while the monsoon season makes the surrounding landscapes greener."
    },
  },

  {
    slug: "khajuraho",
    name: "Khajuraho",
    country: "India",
    bestMonths: [10, 11, 12, 1, 2, 3],
    budgetTier: "mid",
    tags: ["temples", "architecture", "heritage", "madhya-pradesh", "history"],
    tagline: "Chandela temple carving, unmatched anywhere in India.",
    image: {
      id: "photo-1606298855672-3efb63017be8",
      alt: "The Kandariya Mahadeva temple covered in intricate stone carving at Khajuraho",
    },
    sections: {
      overview:
        "Khajuraho in Madhya Pradesh is internationally known for its historic temple complexes and detailed stone carvings. The destination is an important example of medieval Indian architecture and is popular with visitors interested in history and heritage.",

      food:
        "Khajuraho offers North Indian and Madhya Pradesh cuisine along with restaurants serving international food for tourists. Local dishes, vegetarian meals and traditional snacks are widely available.",

      attractions:
        "The Western Group of Temples is the main attraction and includes the famous Kandariya Mahadeva Temple. Other attractions include the Eastern and Southern temple groups, museums and nearby Panna National Park.",

      gettingAround:
        "Many major temples are located close to each other and can be explored on foot or by bicycle. Auto-rickshaws and taxis are useful for visiting attractions farther away.",

      whenToGo:
        "October to March is the most comfortable period for exploring the temple complexes. Summers are very hot and less suitable for long outdoor visits."
    },
  },

  {
    slug: "goa",
    name: "Goa",
    country: "India",
    bestMonths: [11, 12, 1, 2, 3],
    budgetTier: "mid",
    tags: ["beaches", "nightlife", "food", "coastal", "culture"],
    tagline: "Beaches, Portuguese churches and the country's best seafood.",
    image: {
      id: "photo-1614082242765-7c98ca0f3df3",
      alt: "Colourful wooden beach huts among palm trees on a Goan shore",
    },
    sections: {
      overview:
        "Goa is one of India's most popular beach destinations and is known for its coastline, Portuguese-influenced architecture, nightlife and relaxed atmosphere. The state offers both lively beach areas and quieter coastal villages.",

      food:
        "Goan cuisine includes seafood, fish curry, prawn dishes, vindaloo and traditional Portuguese-influenced recipes. Vegetarian food and international cuisine are also widely available in popular tourist areas.",

      attractions:
        "Popular attractions include Baga Beach, Palolem Beach, Anjuna Beach, Old Goa churches, Panjim, Dudhsagar Falls and several coastal villages.",

      gettingAround:
        "Scooters and rental cars are popular ways to explore Goa. Taxis are available, while public buses connect many towns and major areas across the state.",

      whenToGo:
        "November to March is the most popular period because of pleasant beach weather. The monsoon season brings heavy rain but offers greener landscapes and fewer tourists."
    },
  },

  {
    slug: "munnar",
    name: "Munnar",
    country: "India",
    bestMonths: [9, 10, 11, 12, 1, 2, 3],
    budgetTier: "mid",
    tags: ["tea", "hills", "nature", "kerala", "scenic"],
    tagline: "Tea terraces in the clouds, high in the Western Ghats.",
    image: {
      id: "photo-1491497895121-1334fc14d8c9",
      alt: "Misty green tea gardens on rolling hills in Munnar, Kerala",
    },
    sections: {
      overview:
        "Munnar in Kerala is a scenic hill destination famous for rolling tea plantations, green mountains and cool weather. It is popular with travelers looking for nature, peaceful landscapes and outdoor experiences.",

      food:
        "Munnar offers Kerala cuisine including appam, puttu, dosa, seafood dishes and traditional vegetarian meals. Tea is an important local product, and visitors can try different varieties from nearby plantations.",

      attractions:
        "Popular attractions include tea plantations, Eravikulam National Park, Mattupetty Dam, Echo Point, Top Station and several scenic waterfalls and viewpoints.",

      gettingAround:
        "Taxis and private cars are the most convenient ways to explore Munnar because many attractions are spread across hilly areas. Walking is useful for exploring local towns and nearby viewpoints.",

      whenToGo:
        "September to March generally offers pleasant weather and clear views. The monsoon season makes the region especially green but can bring heavy rainfall."
    },
  },

  {
    slug: "kochi",
    name: "Kochi",
    country: "India",
    bestMonths: [10, 11, 12, 1, 2, 3],
    budgetTier: "mid",
    tags: ["heritage", "coastal", "food", "kerala", "culture"],
    tagline: "Fishing nets, spice godowns and five centuries of trade.",
    image: {
      id: "photo-1645680149311-5a00ae5a2b2a",
      alt: "Cantilevered Chinese fishing nets over the water at Fort Kochi",
    },
    sections: {
      overview:
        "Kochi in Kerala is a historic coastal city known for its multicultural heritage, colonial architecture and connection to maritime trade. The city combines traditional Kerala culture with Portuguese, Dutch and British influences.",

      food:
        "Kochi is known for Kerala cuisine, seafood, appam, stew and traditional South Indian meals. Fort Kochi also has many cafes and restaurants serving international cuisine.",

      attractions:
        "Major attractions include Fort Kochi, Chinese fishing nets, Mattancherry Palace, Jew Town, St Francis Church and Marine Drive.",

      gettingAround:
        "Auto-rickshaws, taxis and app-based cabs are convenient for local travel. Ferries and water transport are also useful for travelling between some parts of Kochi.",

      whenToGo:
        "October to March is generally the most comfortable period for sightseeing. The monsoon season brings heavy rainfall and humid weather."
    },
  },

  {
    slug: "darjeeling",
    name: "Darjeeling",
    country: "India",
    bestMonths: [3, 4, 5, 10, 11],
    budgetTier: "mid",
    tags: ["tea", "mountains", "himalayas", "scenic", "west-bengal"],
    tagline: "Tea slopes, a toy train, and Kanchenjunga on a clear morning.",
    image: {
      id: "photo-1710705420812-988808e6350b",
      alt: "A tea-covered hillside above Darjeeling under a bright sky",
    },
    sections: {
      overview:
        "Darjeeling in West Bengal is a Himalayan hill destination famous for tea plantations, mountain views and colonial-era heritage. On clear days, visitors can enjoy views of Kanchenjunga and the surrounding Himalayan landscape.",

      food:
        "Darjeeling offers Tibetan, Nepali, Bengali and North Indian cuisine. Popular foods include momos, thukpa, noodles and locally produced Darjeeling tea.",

      attractions:
        "Major attractions include Tiger Hill, the Darjeeling Himalayan Railway, Batasia Loop, tea gardens, Peace Pagoda and several viewpoints overlooking the Himalayas.",

      gettingAround:
        "The main town can be explored on foot, while taxis are commonly used for visiting viewpoints and attractions outside the center. Shared vehicles are also available on many local routes.",

      whenToGo:
        "March to May and October to November generally offer pleasant weather and better mountain views. Heavy monsoon rainfall can affect travel during the rainy season."
    },
  },

  {
    slug: "gangtok",
    name: "Gangtok",
    country: "India",
    bestMonths: [3, 4, 5, 10, 11],
    budgetTier: "mid",
    tags: ["mountains", "himalayas", "nature", "sikkim", "culture"],
    tagline: "A hill capital with the Himalaya on its doorstep.",
    image: {
      id: "photo-1635346537940-9d51faeb6e32",
      alt: "A hillside town in Sikkim at sunset with mountains behind",
    },
    sections: {
      overview:
        "Gangtok is the capital of Sikkim and a popular Himalayan destination known for mountain scenery, Buddhist culture and peaceful surroundings. It is also a gateway for exploring lakes, monasteries and high-altitude areas in Sikkim.",

      food:
        "Gangtok offers Tibetan, Nepali and Sikkimese cuisine along with Indian food. Popular options include momos, thukpa, noodles and traditional Himalayan dishes.",

      attractions:
        "Popular attractions include MG Marg, Rumtek Monastery, Tsomgo Lake, Nathula Pass, Tashi View Point and several monasteries and mountain viewpoints.",

      gettingAround:
        "The central MG Marg area is easy to explore on foot. Taxis are the primary way to travel to attractions outside Gangtok, especially mountain destinations and high-altitude areas.",

      whenToGo:
        "March to May and October to November are generally good periods because of pleasant weather and clearer mountain views. Some high-altitude routes may be affected by winter conditions."
    },
  },
];
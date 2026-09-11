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
];
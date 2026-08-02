/**
 * Identity corpus: the raw material personas are assembled from.
 *
 * Names are grouped by region and drawn as a matched (given, family, city) triple
 * rather than crossing three global pools. Mixing pools is the fastest way to
 * produce names that read as generated — a random given name with a random
 * surname in a random city lands somewhere uncanny far more often than it lands
 * plausibly. Picking the region first keeps every identity internally coherent.
 *
 * These are ordinary common names combined at random. Any resemblance to a
 * specific real person is coincidental, and every seeded account is flagged
 * `isSeeded` in the database so it can never be mistaken for a real signup.
 */

export interface Region {
  key: string;
  /** Relative share of the community. Roughly mirrors where builders online are. */
  weight: number;
  given: readonly string[];
  family: readonly string[];
  cities: readonly string[];
}

export const REGIONS: readonly Region[] = [
  {
    key: "in",
    weight: 26,
    given: [
      "Aarav", "Ananya", "Rohan", "Meera", "Vikram", "Priya", "Arjun", "Divya",
      "Karthik", "Sneha", "Rahul", "Ishita", "Aditya", "Nikhil", "Tanvi", "Siddharth",
      "Kavya", "Manish", "Pooja", "Varun", "Shreya", "Abhinav", "Riya", "Harsh",
      "Neha", "Pranav", "Aditi", "Sahil", "Lakshmi", "Yash", "Ritika", "Devansh",
    ],
    family: [
      "Sharma", "Patel", "Reddy", "Iyer", "Nair", "Gupta", "Menon", "Kulkarni",
      "Chatterjee", "Rao", "Desai", "Bhatt", "Joshi", "Mehta", "Banerjee", "Pillai",
      "Agarwal", "Verma", "Sethi", "Kapoor", "Krishnan", "Deshmukh", "Sinha", "Bose",
    ],
    cities: [
      "Bengaluru, India", "Hyderabad, India", "Pune, India", "Chennai, India",
      "Mumbai, India", "Delhi NCR, India", "Kochi, India", "Ahmedabad, India",
      "Jaipur, India", "Bhubaneswar, India", "Indore, India", "Chandigarh, India",
    ],
  },
  {
    key: "us",
    weight: 20,
    given: [
      "Maya", "Ethan", "Olivia", "Caleb", "Harper", "Nathan", "Grace", "Owen",
      "Chloe", "Miles", "Sadie", "Jonah", "Riley", "Elena", "Marcus", "Nora",
      "Theo", "Ivy", "Desmond", "Camila", "Wesley", "Amara", "Jasper", "Sloane",
      "Malik", "Beatrice", "Silas", "Imani", "Rowan", "Josephine",
    ],
    family: [
      "Whitfield", "Ramirez", "Hollis", "Okafor", "Delgado", "Brennan", "Castellanos",
      "Sinclair", "Marchetti", "Abernathy", "Vasquez", "Lindqvist", "Beaumont",
      "Kaminski", "Duarte", "Fairbanks", "Ngata", "Salcedo", "Thornbury", "Ellsworth",
      "Cardenas", "Whitaker", "Prescott", "Amado",
    ],
    cities: [
      "San Francisco, USA", "Seattle, USA", "Austin, USA", "New York, USA",
      "Boston, USA", "Denver, USA", "Chicago, USA", "Atlanta, USA",
      "Portland, USA", "Pittsburgh, USA", "Toronto, Canada", "Vancouver, Canada",
    ],
  },
  {
    key: "eu",
    weight: 18,
    given: [
      "Lucas", "Freya", "Mateo", "Ingrid", "Tobias", "Elise", "Niklas", "Saoirse",
      "Matthias", "Anouk", "Kacper", "Lucia", "Bram", "Sofia", "Emil", "Margot",
      "Aleksander", "Nadia", "Joaquim", "Katarina", "Finn", "Elodie", "Sander", "Marta",
    ],
    family: [
      "Van der Berg", "Novak", "Lindholm", "Ferrari", "Kowalski", "Dubois", "Halvorsen",
      "Moreau", "Bianchi", "Andersen", "Szabo", "Fernandes", "Wojcik", "Larsen",
      "Petrov", "Rossi", "De Vries", "Haugen", "Marchand", "Kovacs", "Silva", "Bauer",
    ],
    cities: [
      "Berlin, Germany", "Amsterdam, Netherlands", "London, UK", "Stockholm, Sweden",
      "Barcelona, Spain", "Lisbon, Portugal", "Kraków, Poland", "Copenhagen, Denmark",
      "Zürich, Switzerland", "Dublin, Ireland", "Paris, France", "Milan, Italy",
    ],
  },
  {
    key: "apac",
    weight: 18,
    given: [
      "Wei", "Haruto", "Ji-woo", "Mei", "Kenji", "Soo-ah", "Linh", "Ravi",
      "Yuki", "Min-jun", "Anh", "Chen", "Sakura", "Hyun", "Nadia", "Arif",
      "Siti", "Daniel", "Ling", "Takeshi", "Bao", "Ayu", "Jun", "Hana",
    ],
    family: [
      "Tanaka", "Nakamura", "Park", "Chen", "Nguyen", "Wong", "Lim", "Yamamoto",
      "Kim", "Zhang", "Tran", "Rahman", "Sato", "Lee", "Wijaya", "Ong",
      "Fujimoto", "Hoang", "Goh", "Suzuki", "Cheng", "Putra",
    ],
    cities: [
      "Singapore", "Tokyo, Japan", "Seoul, South Korea", "Ho Chi Minh City, Vietnam",
      "Taipei, Taiwan", "Jakarta, Indonesia", "Kuala Lumpur, Malaysia", "Sydney, Australia",
      "Melbourne, Australia", "Shenzhen, China", "Hong Kong", "Manila, Philippines",
    ],
  },
  {
    key: "latam-mea",
    weight: 18,
    given: [
      "Sofia", "Mateus", "Valentina", "Thiago", "Camila", "Diego", "Isabela", "Emeka",
      "Amina", "Youssef", "Zanele", "Tariq", "Fatima", "Kwame", "Layla", "Rafael",
      "Nour", "Chidi", "Paula", "Omar", "Adaeze", "Bruno", "Salma", "Ngozi",
    ],
    family: [
      "Oliveira", "Santos", "Herrera", "Adeyemi", "El-Sayed", "Mokoena", "Costa",
      "Nkemelu", "Haddad", "Ferreira", "Mensah", "Rojas", "Okonkwo", "Bensalem",
      "Almeida", "Diallo", "Castillo", "Naidoo", "Barbosa", "Mwangi", "Ibrahim", "Peralta",
    ],
    cities: [
      "São Paulo, Brazil", "Mexico City, Mexico", "Buenos Aires, Argentina",
      "Lagos, Nigeria", "Nairobi, Kenya", "Cairo, Egypt", "Cape Town, South Africa",
      "Bogotá, Colombia", "Dubai, UAE", "Tel Aviv, Israel", "Santiago, Chile", "Accra, Ghana",
    ],
  },
];

/**
 * Employers. Split by kind so a persona's company matches their archetype — a
 * student is at a university, a founder is at their own company, a recruiter is
 * at an agency. Names are a mix of well-known companies (people genuinely do
 * work there) and invented ones for the startup tier.
 */
export const COMPANIES = {
  bigTech: [
    "Google", "Microsoft", "Amazon", "Meta", "Apple", "Netflix", "NVIDIA", "Adobe",
    "Salesforce", "Uber", "Airbnb", "Spotify", "Shopify", "Atlassian", "Datadog",
    "Cloudflare", "Stripe", "Snowflake", "MongoDB", "Elastic", "Twilio", "Databricks",
  ],
  scaleup: [
    "Vercel", "Linear", "Supabase", "PlanetScale", "Railway", "Render", "Fly.io",
    "Neon", "Clerk", "Resend", "Temporal", "Grafana Labs", "HashiCorp", "Hugging Face",
    "Replicate", "LangChain", "Weights & Biases", "Modal", "Pinecone", "Sentry",
  ],
  services: [
    "Infosys", "TCS", "Wipro", "Accenture", "Thoughtworks", "EPAM", "Globant",
    "Zoho", "Freshworks", "Razorpay", "Zerodha", "Swiggy", "Flipkart", "PhonePe",
  ],
  /** Invented — used for founder/early-stage personas. */
  startup: [
    "Loomstack", "Verity Labs", "Riftwave", "Northpine", "Cadenza", "Halcyon Systems",
    "Bitforge", "Klarity", "Meridian AI", "Opsera", "Tessel", "Groundwork",
    "Ambergraph", "Fernpath", "Slate & Signal", "Quanta Works", "Driftless",
    "Copperline", "Aperture Data", "Winterlight", "Modulate", "Basalt",
  ],
  university: [
    "IIT Bombay", "IIT Delhi", "IIT Madras", "IIIT Hyderabad", "BITS Pilani",
    "NIT Trichy", "NIT Hamirpur", "VIT Vellore", "Stanford University", "MIT",
    "Carnegie Mellon University", "UC Berkeley", "Georgia Tech", "University of Waterloo",
    "TU Delft", "ETH Zürich", "NUS", "NTU Singapore", "University of Toronto",
    "TU Munich", "KTH Stockholm", "University of Edinburgh",
  ],
  agency: [
    "Hirewell", "TalentBridge", "Northstar Search", "Cortex Recruiting",
    "Beacon Talent", "Foundry People", "Ascend Partners", "Signal Search",
  ],
} as const;

/** Free-form "what I'm building right now" clauses used in headlines. */
export const FOCUS_CLAUSES = [
  "shipping small things often",
  "building in the open",
  "learning by breaking things",
  "obsessed with developer experience",
  "writing about what I learn",
  "making complex systems feel simple",
  "one commit at a time",
  "documenting the messy middle",
  "chasing lower p99s",
  "trying to make the docs good",
  "reading papers, shipping code",
  "long-term optimist, short-term debugger",
  "currently deep in a rabbit hole",
  "building the tool I wish existed",
] as const;

/** Sentence fragments used to assemble varied multi-line bios. */
export const BIO_OPENERS = [
  "Previously {prev}.",
  "{years} years in and still enjoying it.",
  "Ex-{prev}, now {current}.",
  "Started in {origin}, ended up in {field}.",
  "Self-taught, permanently curious.",
  "Career-switched from {origin} at {age}.",
] as const;

export const BIO_CLOSERS = [
  "Happy to talk about {topic} with anyone.",
  "DMs open for {topic} questions.",
  "Always up for a good {topic} argument.",
  "Currently reading everything I can find on {topic}.",
  "Will trade {topic} tips for coffee recommendations.",
  "Mentoring two juniors — ask me how it's going.",
  "Writing a newsletter about {topic}, badly.",
  "Opinions are load-bearing and subject to change.",
] as const;

export const PRIOR_LIVES = [
  "a bootcamp grad", "an intern who never left", "a physics undergrad",
  "a support engineer", "a QA analyst", "a data analyst", "a sysadmin",
  "a freelance dev", "a research assistant", "a maths teacher", "a game modder",
] as const;

export const ORIGIN_FIELDS = [
  "mechanical engineering", "biology", "economics", "graphic design", "journalism",
  "civil engineering", "music", "accounting", "psychology", "architecture",
] as const;

/** Pronoun sets. Left off most profiles — only some people fill this in. */
export const PRONOUNS = ["she/her", "he/him", "they/them"] as const;

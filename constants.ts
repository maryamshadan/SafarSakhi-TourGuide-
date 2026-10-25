
import { Monument, SafetyLevel, POI, Badge } from './types';

export const MONUMENTS: Monument[] = [
  {
    id: '1',
    name: 'Charminar',
    type: 'Monument',
    description: 'The global icon of Hyderabad, standing as a symbol of the city’s rich heritage. This square-shaped structure features four grand arches and four exquisite minarets that soar 56 meters into the sky, overlooking the bustling Laad Bazaar.',
    history: 'Constructed in 1591 by Sultan Muhammad Quli Qutb Shah, the fifth ruler of the Qutb Shahi dynasty. It was built to commemorate the end of a deadly plague that had ravaged the city. Legend says a secret tunnel connects it to Golconda Fort for the royal family\'s escape during distress.',
    lat: 17.3616,
    lon: 78.4747,
    safetyScore: 60,
    safetyLevel: SafetyLevel.CAUTION,
    imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/7/71/Charminar_Hyderabad_1.jpg',
    imageTitle: 'Charminar Hyderabad',
    imageSourcePage: 'https://commons.wikimedia.org/wiki/File:Charminar_Hyderabad_1.jpg',
    imageCreator: 'DidierTais',
    imageLicense: 'CC BY-SA 3.0',
    imageVerificationStatus: 'VERIFIED'
  },
  {
    id: '2',
    name: 'Golconda Fort',
    type: 'Fort',
    description: 'A majestic citadel famous for its sophisticated acoustic system, where a hand clap at the entrance can be heard at the hilltop pavilion. The complex includes mosques, temples, granaries, and royal chambers atop a 120-meter high granite hill.',
    history: 'Originally a mud fort built by the Kakatiyas, it was expanded by the Qutb Shahi sultans into a massive granite fortification. It was the capital of the medieval sultanate and a center for the diamond trade, famously associated with the Koh-i-Noor and Hope diamonds.',
    lat: 17.3833,
    lon: 78.4011,
    safetyScore: 85,
    safetyLevel: SafetyLevel.SAFE,
    imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/1/1a/Golconda_Fort_and_Hyderabad_city.jpg',
    imageTitle: 'Golconda Fort and Hyderabad city',
    imageSourcePage: 'https://commons.wikimedia.org/wiki/File:Golconda_Fort_and_Hyderabad_city.jpg',
    imageCreator: 'iMahesh',
    imageLicense: 'CC BY-SA 4.0',
    imageVerificationStatus: 'VERIFIED'
  },
  {
    id: '3',
    name: 'Qutb Shahi Tombs',
    type: 'Tombs',
    description: 'A serene necropolis containing the tombs of the seven Qutb Shahi rulers. These majestic domed structures are set amidst landscaped gardens (Ibrahim Bagh) and represent a unique architectural blend of Persian, Pashtun, and Hindu styles.',
    history: 'Built during the reign of the Qutb Shahi dynasty (16th–17th centuries), these are among the few necropolises in the world where an entire dynasty is buried in one place. The tombs were planned and built by the kings themselves during their lifetimes.',
    lat: 17.3966,
    lon: 78.3966,
    safetyScore: 80,
    safetyLevel: SafetyLevel.SAFE,
    imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/c/cd/Qutb_Shahi_Tombs_-_small_tomb.jpg',
    imageTitle: 'Qutb Shahi Tombs small tomb',
    imageSourcePage: 'https://commons.wikimedia.org/wiki/File:Qutb_Shahi_Tombs_-_small_tomb.jpg',
    imageCreator: 'Bernard Gagnon',
    imageLicense: 'CC BY-SA 3.0',
    imageVerificationStatus: 'VERIFIED'
  },
  {
    id: '4',
    name: 'Chowmahalla Palace',
    type: 'Palace',
    description: 'A magnificent palace complex that served as the official residence of the Nizams of Hyderabad. It features four palaces (Chow-Mahalla), intricate clock towers, and the grand Khilwat Mubarak (Durbar Hall) with spectacular crystal chandeliers.',
    history: 'Construction began in 1750 by Salabat Jung and was completed by Nizam Afzal-ud-Dawlah in 1869. Modeled after the Shah of Iran\'s palace in Tehran, it hosted grand durbars and royal ceremonies for the Asaf Jahi dynasty for over a century.',
    lat: 17.3578,
    lon: 78.4717,
    safetyScore: 95,
    safetyLevel: SafetyLevel.SAFE,
    imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/7/78/Chowmahalla_Palace_gate_tower_01.jpg',
    imageTitle: 'Chowmahalla Palace gate tower',
    imageSourcePage: 'https://commons.wikimedia.org/wiki/File:Chowmahalla_Palace_gate_tower_01.jpg',
    imageCreator: 'Bernard Gagnon',
    imageLicense: 'CC BY-SA 3.0',
    imageVerificationStatus: 'VERIFIED'
  },
  {
    id: '5',
    name: 'Falaknuma Palace',
    type: 'Palace',
    description: 'Known as the "Mirror of the Sky," this scorpion-shaped palace is perched 2,000 feet above Hyderabad. It is renowned for its Italian marble staircases, Venetian chandeliers, and the 101-seat dining table, one of the largest in the world.',
    history: 'Built by Nawab Vikar-ul-Umra, the Prime Minister of Hyderabad, in 1893, it was later purchased by the 6th Nizam, Mahboob Ali Khan. It served as a royal guest house for dignitaries like King George V and Czar Nicholas II before becoming a luxury hotel.',
    lat: 17.3312,
    lon: 78.4672,
    safetyScore: 99,
    safetyLevel: SafetyLevel.SAFE,
    imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/2/28/Falaknuma_Palace_04.jpg',
    imageTitle: 'Falaknuma Palace 04',
    imageSourcePage: 'https://commons.wikimedia.org/wiki/File:Falaknuma_Palace_04.jpg',
    imageCreator: 'Bernard Gagnon',
    imageLicense: 'CC BY-SA 3.0',
    imageVerificationStatus: 'VERIFIED'
  },
  {
    id: '6',
    name: 'Birla Mandir',
    type: 'Temple',
    description: 'A gleaming white Hindu temple dedicated to Lord Venkateswara, built entirely of 2000 tons of pure Rajasthani white marble. Located on the Naubat Pahad hill, it offers panoramic views of Hyderabad and Hussain Sagar Lake.',
    history: 'Construction took ten years and was completed in 1976 by the Birla Foundation. The temple blends Dravidian, Rajasthani, and Utkala architectural styles. Swami Ranganathananda of Ramakrishna Mission inaugurated it as a place for meditation with no bells.',
    lat: 17.4062,
    lon: 78.4691,
    safetyScore: 95,
    safetyLevel: SafetyLevel.SAFE,
    imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/8/87/Birla_Mandir_Hyderabad_in_afternoon.jpg',
    imageTitle: 'Birla Mandir Hyderabad in afternoon',
    imageSourcePage: 'https://commons.wikimedia.org/wiki/File:Birla_Mandir_Hyderabad_in_afternoon.jpg',
    imageCreator: 'Adityamadhav83',
    imageLicense: 'CC BY-SA 3.0',
    imageVerificationStatus: 'VERIFIED'
  },
  {
    id: '7',
    name: 'Mecca Masjid',
    type: 'Mosque',
    description: 'One of the oldest and largest mosques in India, capable of accommodating 10,000 worshippers. The main hall is 75 feet high, 220 feet wide, and 180 feet long, creating a profound sense of spiritual grandeur.',
    history: 'Commissioned by Muhammad Quli Qutb Shah in 1617, the mosque\'s central arch was built using bricks made from soil brought specifically from Mecca, Saudi Arabia. The construction was completed by the Mughal Emperor Aurangzeb in 1694 after he conquered Hyderabad.',
    lat: 17.3603,
    lon: 78.4736,
    safetyScore: 65,
    safetyLevel: SafetyLevel.CAUTION,
    imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/a/ac/Mecca_Masjid%2C_Hyderabad%2C_India.jpg',
    imageTitle: 'Mecca Masjid, Hyderabad, India',
    imageSourcePage: 'https://commons.wikimedia.org/wiki/File:Mecca_Masjid,_Hyderabad,_India.jpg',
    imageCreator: 'Lala Deen Dayal',
    imageLicense: 'Public domain',
    imageVerificationStatus: 'VERIFIED'
  },
  {
    id: '8',
    name: 'Ramappa Temple',
    type: 'Temple',
    description: 'A UNESCO World Heritage Site, this Shiva temple is a marvel of Kakatiyan engineering. It is famous for its "floating bricks," intricate carvings of dancers that inspired Jayapa Senani’s dance treatise, and the sandbox technology used in its foundation.',
    history: 'Built in 1213 AD by Recharla Rudra, a general of Kakatiya King Ganapati Deva. It is arguably the only temple in India named after its sculptor, Ramappa, rather than the presiding deity. The structure has withstood centuries of earthquakes due to its unique foundation.',
    lat: 18.2589,
    lon: 79.9432,
    safetyScore: 92,
    safetyLevel: SafetyLevel.SAFE,
    imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/8/8f/WHS_Ramappa_Temple_1.jpg',
    imageTitle: 'WHS Ramappa Temple 1',
    imageSourcePage: 'https://commons.wikimedia.org/wiki/File:WHS_Ramappa_Temple_1.jpg',
    imageCreator: 'Khushi Shah 280',
    imageLicense: 'CC BY-SA 4.0',
    imageVerificationStatus: 'VERIFIED'
  },
  {
    id: '9',
    name: 'Warangal Fort',
    type: 'Fort',
    description: 'The ruins of a once-impregnable fortress featuring four massive ornamental stone gateways known as Kakatiya Kala Thoranam. The site showcases the architectural prowess of the Kakatiya dynasty with intricate stone carvings and varying layers of fortification.',
    history: 'Construction began in the 12th century under King Ganapati Deva and was completed by his daughter, Rani Rudrama Devi. It was the capital of the Kakatiya kingdom until its fall to the Delhi Sultanate in 1323, leading to the destruction of much of the fort.',
    lat: 17.9576,
    lon: 79.6052,
    safetyScore: 75,
    safetyLevel: SafetyLevel.CAUTION,
    imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/9/90/Kakatiya_Kala_Thoranam_at_Warangal_Fort.jpg',
    imageTitle: 'Kakatiya Kala Thoranam at Warangal Fort',
    imageSourcePage: 'https://commons.wikimedia.org/wiki/File:Kakatiya_Kala_Thoranam_at_Warangal_Fort.jpg',
    imageCreator: 'Sujith Mohan',
    imageLicense: 'CC BY-SA 3.0',
    imageVerificationStatus: 'VERIFIED'
  },
  {
    id: '10',
    name: 'Yadadri Temple',
    type: 'Temple',
    description: 'A grand Hindu temple situated on a hillock, dedicated to Lord Narasimha Swamy. The newly renovated complex is built entirely of black granite (Krushna Sila) and features spectacular sculptures, gopurams, and a golden vimana.',
    history: 'Ancient scriptures mention this as the abode where Lord Narasimha appeared in five forms for Sage Yadarishi. The temple recently underwent a massive reconstruction by the Telangana government, transforming it into one of the largest temple complexes in India.',
    lat: 17.5886,
    lon: 78.9432,
    safetyScore: 98,
    safetyLevel: SafetyLevel.SAFE,
    imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/e/ef/Sri_Lakshminarasimha_Swamy_Temple_Yadagirigutta_Yadadri_Telangana_02.jpg',
    imageTitle: 'Sri Lakshminarasimha Swamy Temple Yadagirigutta Yadadri Telangana 02',
    imageSourcePage: 'https://commons.wikimedia.org/wiki/File:Sri_Lakshminarasimha_Swamy_Temple_Yadagirigutta_Yadadri_Telangana_02.jpg',
    imageCreator: 'Ravindraoudeptling',
    imageLicense: 'CC BY 4.0',
    imageVerificationStatus: 'VERIFIED'
  },
  {
    id: '11',
    name: 'Bhadrachalam Temple',
    type: 'Temple',
    description: 'Located on the banks of the Godavari River, this is one of the most significant Rama temples in India, often called the "Ayodhya of the South." The temple complex is known for its vibrant spiritual atmosphere and beautiful carvings.',
    history: 'Built in the 17th century by Kancherla Gopanna (Bhakta Ramadas), a revenue official who used tax money for construction and was imprisoned by the Tanishah of Golconda. Legend says Lord Rama and Lakshmana repaid the money to the king to secure his release.',
    lat: 17.6688,
    lon: 80.8936,
    safetyScore: 90,
    safetyLevel: SafetyLevel.SAFE,
    imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/1/14/Bhadrachalam_temple_04122016.jpg',
    imageTitle: 'Bhadrachalam temple',
    imageSourcePage: 'https://commons.wikimedia.org/wiki/File:Bhadrachalam_temple_04122016.jpg',
    imageCreator: 'Nikhilb239',
    imageLicense: 'CC BY 3.0',
    imageVerificationStatus: 'VERIFIED'
  },
  {
    id: '12',
    name: 'Salar Jung Museum',
    type: 'Museum',
    description: 'One of the largest one-man collections of antiques in the world. The museum houses over a million objects, including the famous Veiled Rebecca statue, the Musical Clock, and a vast collection of manuscripts, weapons, and carpets.',
    history: 'Established in 1951, the collection belonged to the Salar Jung family, primarily Salar Jung III (Mir Yousuf Ali Khan), who served as Prime Minister to the Nizam. He dedicated his entire life and fortune to collecting artifacts from across the globe.',
    lat: 17.3714,
    lon: 78.4804,
    safetyScore: 98,
    safetyLevel: SafetyLevel.SAFE,
    imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/a/ac/Salar_Jung_Museum%2C_Hyderabad%2C_India.jpg',
    imageTitle: 'Salar Jung Museum, Hyderabad, India',
    imageSourcePage: 'https://commons.wikimedia.org/wiki/File:Salar_Jung_Museum,_Hyderabad,_India.jpg',
    imageCreator: 'Omer123hussain',
    imageLicense: 'CC BY-SA 4.0',
    imageVerificationStatus: 'VERIFIED'
  },
  {
    id: '13',
    name: 'Thousand Pillar Temple',
    type: 'Temple',
    description: 'A masterpiece of Kakatiya architecture located in Hanamkonda. The star-shaped temple is dedicated to Shiva, Vishnu, and Surya, supported by 1,000 richly carved pillars that are arranged so that none obstruct the view of the deity.',
    history: 'Built in 1163 AD by King Rudra Deva. It serves as a classic example of the Kakatiya style of architecture, characterized by intricate stone sculpture and the use of sandbox foundations. It was desecrated by the Tughlaq dynasty but remains a vital heritage site.',
    lat: 18.0030,
    lon: 79.5744,
    safetyScore: 88,
    safetyLevel: SafetyLevel.SAFE,
    imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/e/e4/Hanamkonda_Temple...JPG',
    imageTitle: 'Hanamkonda Temple Thousand Pillar',
    imageSourcePage: 'https://commons.wikimedia.org/wiki/File:Hanamkonda_Temple...JPG',
    imageCreator: 'Rmuthuprakash',
    imageLicense: 'CC BY-SA 3.0',
    imageVerificationStatus: 'VERIFIED'
  },
  {
    id: '14',
    name: 'Pakhal Lake',
    type: 'Nature',
    description: 'A serene man-made lake situated amidst the Pakhal Wildlife Sanctuary. It offers a picturesque retreat with lush forests surrounding the waters, providing a habitat for leopards, panthers, and bears.',
    history: 'This artificial lake was excavated in 1213 AD by the Kakatiya King Ganapati Deva to serve as an irrigation source. It stands as a testimony to the advanced hydraulic engineering skills of the Kakatiya era.',
    lat: 17.9536,
    lon: 79.9906,
    safetyScore: 50,
    safetyLevel: SafetyLevel.CAUTION,
    imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/c/ca/Pakhal_Lake_Telangana.jpg',
    imageTitle: 'Pakhal Lake Telangana',
    imageSourcePage: 'https://commons.wikimedia.org/wiki/File:Pakhal_Lake_Telangana.jpg',
    imageCreator: 'Alosh Bennett',
    imageLicense: 'CC BY 2.0',
    imageVerificationStatus: 'VERIFIED'
  },
  {
    id: '15',
    name: 'Kondapalli Fort',
    type: 'Fort',
    description: 'A massive hill fortress near Vijayawada (bordering Telangana/Andhra), known for its scenic views and the nearby village famous for crafting "Kondapalli toys" from soft wood. The fort features three successive entry gates and a royal palace.',
    history: 'Built by Prolaya Vema Reddy in the 14th century, it later passed into the hands of the Gajapatis of Odisha and then the Qutb Shahis. It served as a military training base and a strategic defense point for centuries.',
    lat: 16.6167,
    lon: 80.5333,
    safetyScore: 70,
    safetyLevel: SafetyLevel.SAFE,
    imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/5/5a/Vijayawada-Kondapalli_Quilla.jpg',
    imageTitle: 'Vijayawada-Kondapalli Quilla',
    imageSourcePage: 'https://commons.wikimedia.org/wiki/File:Vijayawada-Kondapalli_Quilla.jpg',
    imageCreator: 'Quest prithvi',
    imageLicense: 'Public domain',
    imageVerificationStatus: 'VERIFIED'
  },
  {
    id: '16',
    name: 'Paigah Tombs',
    type: 'Tombs',
    description: 'The final resting place of the Paigah nobility, who were high-ranking aristocrats in the Nizam\'s court. The tombs are celebrated for their unique lime and mortar craftsmanship, featuring intricate trellis work and geometric patterns.',
    history: 'Constructed in the late 18th century, the Paigahs were arguably the most powerful family in Hyderabad after the Nizams. These tombs display a distinct architectural style that blends Mughal, Greek, Persian, Asaf Jahi, and Rajasthani motifs.',
    lat: 17.3457,
    lon: 78.5053,
    safetyScore: 75,
    safetyLevel: SafetyLevel.CAUTION,
    imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/8/85/Paigah_Tombs_03.jpg',
    imageTitle: 'Paigah Tombs 03',
    imageSourcePage: 'https://commons.wikimedia.org/wiki/File:Paigah_Tombs_03.jpg',
    imageCreator: 'Bernard Gagnon',
    imageLicense: 'CC BY-SA 3.0',
    imageVerificationStatus: 'VERIFIED'
  },
  {
    id: '17',
    name: 'Jagannath Temple',
    type: 'Temple',
    description: 'A modern architectural marvel located in Banjara Hills, built as a replica of the famous Puri Jagannath Temple. The temple is constructed using reddish sandstone and features 600-foot high shikhara with intricate carvings.',
    history: 'Constructed by the Kalinga Cultural Trust and consecrated in 2009. It serves as a cultural hub for the Odia community in Hyderabad and is known for its annual Ratha Yatra festival, mirroring the traditions of Puri.',
    lat: 17.4139,
    lon: 78.4419,
    safetyScore: 95,
    safetyLevel: SafetyLevel.SAFE,
    imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/b/bf/Jagannath_Temple%2C_Banjara_Hills_6.jpg',
    imageTitle: 'Jagannath Temple, Banjara Hills 6',
    imageSourcePage: 'https://commons.wikimedia.org/wiki/File:Jagannath_Temple,_Banjara_Hills_6.jpg',
    imageCreator: 'Yakshitha',
    imageLicense: 'CC BY-SA 4.0',
    imageVerificationStatus: 'VERIFIED'
  },
  {
    id: '18',
    name: 'Bhadrakali Temple',
    type: 'Temple',
    description: 'One of the oldest temples dedicated to Goddess Bhadrakali, located on a hilltop between Hanamkonda and Warangal. The deity is depicted with fierce eyes and eight arms, wielding weapons, carved out of a single stone.',
    history: 'Originally built in 625 AD by King Pulakeshin II of the Chalukya dynasty to commemorate his victory over the Vengi region. It was later adopted and worshipped by the Kakatiya kings, who considered Goddess Bhadrakali their kuladevata (clan deity).',
    lat: 17.9964,
    lon: 79.5713,
    safetyScore: 88,
    safetyLevel: SafetyLevel.SAFE,
    imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/4/44/Bhadrakali_Temple%2C_Warangal.jpg',
    imageTitle: 'Bhadrakali Temple, Warangal',
    imageSourcePage: 'https://commons.wikimedia.org/wiki/File:Bhadrakali_Temple,_Warangal.jpg',
    imageCreator: 'Warangalite',
    imageLicense: 'CC BY-SA 4.0',
    imageVerificationStatus: 'VERIFIED'
  },
  {
    id: '19',
    name: 'Nizams Museum',
    type: 'Museum',
    description: 'Located in the Purani Haveli, this museum displays the personal gifts and mementos received by the last Nizam, Osman Ali Khan. Highlights include a golden tiffin box studded with diamonds and a 150-year-old manual lift.',
    history: 'The museum was opened to the public in 2000. It is housed in the Purani Haveli, which was the residence of the second Nizam. The collection offers an intimate glimpse into the opulent lifestyle of the dynasty that was once the richest in the world.',
    lat: 17.3655,
    lon: 78.4811,
    safetyScore: 90,
    safetyLevel: SafetyLevel.SAFE,
    imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/0/0f/Nizam_museum.jpg',
    imageTitle: 'Nizam museum',
    imageSourcePage: 'https://commons.wikimedia.org/wiki/File:Nizam_museum.jpg',
    imageCreator: 'Randhirreddy',
    imageLicense: 'Public domain',
    imageVerificationStatus: 'VERIFIED'
  },
  {
    id: '20',
    name: 'Kondagattu Anjaneya Swamy',
    type: 'Temple',
    description: 'A revered shrine dedicated to Lord Hanuman, situated amidst hills and hillocks in Jagtial district. It is believed that visiting this temple brings relief to those suffering from mental and physical ailments.',
    history: 'According to folklore, the temple was built by a cowherd about 400 years ago after Lord Hanuman appeared in his dream. The idol is unique as it features two faces (Narasimha and Hanuman), making it a powerful site for devotees.',
    lat: 18.6433,
    lon: 78.9038,
    safetyScore: 85,
    safetyLevel: SafetyLevel.SAFE,
    imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/b/b4/Kondagattu_temple_near_Karimnagar%2C_India.jpg',
    imageTitle: 'Kondagattu temple near Karimnagar, India',
    imageSourcePage: 'https://commons.wikimedia.org/wiki/File:Kondagattu_temple_near_Karimnagar,_India.jpg',
    imageCreator: 'Manasa.mani',
    imageLicense: 'CC BY-SA 4.0',
    imageVerificationStatus: 'VERIFIED'
  }
];

/**
 * Generates an authentic local-only SVG data URI placeholder for monuments
 * without depending on external network assets or broken image links.
 */
export function getMonumentFallbackSvg(name: string, type: string): string {
  const colors: Record<string, { bg1: string; bg2: string; accent: string }> = {
    Temple: { bg1: '#7c2d12', bg2: '#431407', accent: '#fdba74' },
    Fort: { bg1: '#1e293b', bg2: '#0f172a', accent: '#94a3b8' },
    Palace: { bg1: '#581c87', bg2: '#3b0764', accent: '#d8b4fe' },
    Tombs: { bg1: '#14532d', bg2: '#052e16', accent: '#86efac' },
    Museum: { bg1: '#1e3a8a', bg2: '#172554', accent: '#93c5fd' },
    Nature: { bg1: '#064e3b', bg2: '#022c22', accent: '#6ee7b7' },
    Monument: { bg1: '#831843', bg2: '#500724', accent: '#f472b6' }
  };

  const scheme = colors[type] || { bg1: '#1e293b', bg2: '#0f172a', accent: '#38bdf8' };
  const safeName = name.replace(/[<>&"]/g, '');
  const safeType = type.replace(/[<>&"]/g, '');

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 500" width="100%" height="100%">
    <defs>
      <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="${scheme.bg1}" />
        <stop offset="100%" stop-color="${scheme.bg2}" />
      </linearGradient>
      <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
        <path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(255,255,255,0.05)" stroke-width="1"/>
      </pattern>
    </defs>
    <rect width="800" height="500" fill="url(#grad)" />
    <rect width="800" height="500" fill="url(#grid)" />
    <g transform="translate(400, 190)" text-anchor="middle">
      <circle cx="0" cy="0" r="70" fill="rgba(255,255,255,0.06)" stroke="${scheme.accent}" stroke-width="2" stroke-dasharray="4,4" />
      <path d="M -30 25 L 0 -35 L 30 25 Z" fill="none" stroke="${scheme.accent}" stroke-width="3" stroke-linejoin="round" />
      <path d="M -45 25 L 45 25" stroke="${scheme.accent}" stroke-width="4" stroke-linecap="round" />
      <circle cx="0" cy="-42" r="5" fill="${scheme.accent}" />
    </g>
    <rect x="250" y="285" width="300" height="28" rx="14" fill="rgba(0,0,0,0.3)" />
    <text x="400" y="304" fill="${scheme.accent}" font-family="system-ui, -apple-system, sans-serif" font-size="12" font-weight="900" letter-spacing="2" text-anchor="middle" text-transform="uppercase">${safeType} • TELANGANA HERITAGE</text>
    <text x="400" y="360" fill="#ffffff" font-family="system-ui, -apple-system, sans-serif" font-size="28" font-weight="900" text-anchor="middle">${safeName}</text>
    <text x="400" y="395" fill="rgba(255,255,255,0.6)" font-family="system-ui, -apple-system, sans-serif" font-size="13" font-weight="500" text-anchor="middle">Historic Site &amp; Verified Travel Zone</text>
  </svg>`;

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

export const POIS: POI[] = [
    // --- HYDERABAD HOTELS ---
    { id: 'h_hyd_1', name: 'Taj Falaknuma Palace', type: 'HOTEL', lat: 17.3312, lon: 78.4672, rating: 5.0, address: 'Engine Bowli, Falaknuma, Hyderabad' },
    { id: 'h_hyd_2', name: 'ITC Kakatiya', type: 'HOTEL', lat: 17.4326, lon: 78.4608, rating: 4.8, address: 'Begumpet, Hyderabad' },
    { id: 'h_hyd_3', name: 'Park Hyatt', type: 'HOTEL', lat: 17.4246, lon: 78.4284, rating: 4.9, address: 'Banjara Hills, Hyderabad' },
    { id: 'h_hyd_4', name: 'Hotel Shadab', type: 'HOTEL', lat: 17.3668, lon: 78.4756, rating: 4.1, address: 'Near Charminar, Hyderabad' },
    { id: 'h_hyd_5', name: 'Trident Hotel', type: 'HOTEL', lat: 17.4485, lon: 78.3725, rating: 4.7, address: 'Hitech City, Hyderabad' },
    { id: 'h_hyd_6', name: 'Taj Krishna', type: 'HOTEL', lat: 17.4162, lon: 78.4499, rating: 4.8, address: 'Banjara Hills, Hyderabad' },
    { id: 'h_hyd_7', name: 'Novotel Airport', type: 'HOTEL', lat: 17.2308, lon: 78.4308, rating: 4.6, address: 'Shamshabad, Hyderabad' },
    { id: 'h_hyd_8', name: 'Marriott Hotel', type: 'HOTEL', lat: 17.4234, lon: 78.4864, rating: 4.7, address: 'Tank Bund, Hyderabad' },
    { id: 'h_hyd_9', name: 'Royalton Hotel', type: 'HOTEL', lat: 17.3888, lon: 78.4782, rating: 4.2, address: 'Abids, Hyderabad' },

    // --- HYDERABAD RESTAURANTS ---
    { id: 'r_hyd_1', name: 'Paradise Biryani', type: 'RESTAURANT', lat: 17.4411, lon: 78.4867, rating: 4.5, address: 'SD Road, Secunderabad' },
    { id: 'r_hyd_2', name: 'Bawarchi', type: 'RESTAURANT', lat: 17.4065, lon: 78.4983, rating: 4.3, address: 'RTC X Roads, Hyderabad' },
    { id: 'r_hyd_3', name: 'Chutneys', type: 'RESTAURANT', lat: 17.4223, lon: 78.4477, rating: 4.4, address: 'Banjara Hills, Hyderabad' },
    { id: 'r_hyd_4', name: 'Shah Ghouse', type: 'RESTAURANT', lat: 17.3618, lon: 78.4700, rating: 4.2, address: 'Charminar, Hyderabad' },
    { id: 'r_hyd_5', name: 'Pista House', type: 'RESTAURANT', lat: 17.3638, lon: 78.4742, rating: 4.3, address: 'Shalibanda, Hyderabad' },
    { id: 'r_hyd_6', name: 'Grand Hotel', type: 'RESTAURANT', lat: 17.3891, lon: 78.4785, rating: 4.1, address: 'Abids, Hyderabad' },
    { id: 'r_hyd_7', name: 'Cafe Niloufer', type: 'RESTAURANT', lat: 17.4021, lon: 78.4623, rating: 4.6, address: 'Red Hills, Hyderabad' },

    // --- WARANGAL HOTELS ---
    { id: 'h_wgl_1', name: 'Haritha Kakatiya', type: 'HOTEL', lat: 17.9520, lon: 79.6010, rating: 4.0, address: 'Nakkalagutta, Warangal' },
    { id: 'h_wgl_2', name: 'Hotel Suprabha', type: 'HOTEL', lat: 17.9800, lon: 79.5800, rating: 3.9, address: 'Hanamkonda, Warangal' },
    { id: 'h_wgl_3', name: 'City Grand Hotel', type: 'HOTEL', lat: 17.9600, lon: 79.5900, rating: 3.8, address: 'Warangal Main Road' },
    { id: 'h_wgl_4', name: 'Ashoka Hotel', type: 'HOTEL', lat: 17.9780, lon: 79.5850, rating: 3.7, address: 'Hanamkonda, Warangal' },

    // --- WARANGAL RESTAURANTS ---
    { id: 'r_wgl_1', name: 'Bayleaf Restaurant', type: 'RESTAURANT', lat: 17.9750, lon: 79.5850, rating: 4.1, address: 'Hanamkonda, Warangal' },
    { id: 'r_wgl_2', name: 'Kakatiya Mess', type: 'RESTAURANT', lat: 17.9550, lon: 79.6000, rating: 4.5, address: 'Near Railway Station, Warangal' },
    { id: 'r_wgl_3', name: 'Haveli Restaurant', type: 'RESTAURANT', lat: 17.9820, lon: 79.5820, rating: 4.0, address: 'Kazipet Road, Warangal' },

    // --- BHADRACHALAM ---
    { id: 'h_bhd_1', name: 'Haritha Bhadrachalam', type: 'HOTEL', lat: 17.6690, lon: 80.8930, rating: 4.0, address: 'Near Temple, Bhadrachalam' },
    { id: 'h_bhd_2', name: 'Sita Nilayam', type: 'HOTEL', lat: 17.6675, lon: 80.8945, rating: 3.8, address: 'Market Road, Bhadrachalam' },
    { id: 'r_bhd_1', name: 'Sri Rama Vilas', type: 'RESTAURANT', lat: 17.6680, lon: 80.8940, rating: 4.2, address: 'Temple Road, Bhadrachalam' },
    { id: 'r_bhd_2', name: 'Godavari Mess', type: 'RESTAURANT', lat: 17.6700, lon: 80.8920, rating: 4.0, address: 'River Bank, Bhadrachalam' },

    // --- YADADRI ---
    { id: 'h_yad_1', name: 'Haritha Yadadri', type: 'HOTEL', lat: 17.5880, lon: 78.9430, rating: 4.1, address: 'Hill Top, Yadagirigutta' },
    { id: 'h_yad_2', name: 'Punnami Hotel', type: 'HOTEL', lat: 17.5800, lon: 78.9400, rating: 3.8, address: 'Downhill, Yadagirigutta' },
    { id: 'r_yad_1', name: 'Temple Canteen', type: 'RESTAURANT', lat: 17.5890, lon: 78.9420, rating: 3.8, address: 'Temple Complex, Yadagirigutta' },

    // --- RAMAPPA / PALAMPET ---
    { id: 'h_rmp_1', name: 'Haritha Lake View Resort', type: 'HOTEL', lat: 18.2600, lon: 79.9450, rating: 4.2, address: 'Ramappa Lake, Palampet' },
    { id: 'r_rmp_1', name: 'Ramappa Tourist Dhaba', type: 'RESTAURANT', lat: 18.2550, lon: 79.9400, rating: 3.6, address: 'Main Road, Palampet' },

    // --- PAKHAL ---
    { id: 'h_pak_1', name: 'Haritha Pakhal Hotel', type: 'HOTEL', lat: 17.9550, lon: 79.9920, rating: 3.9, address: 'Pakhal Sanctuary, Warangal' },
    { id: 'r_pak_1', name: 'Forest Canteen', type: 'RESTAURANT', lat: 17.9530, lon: 79.9900, rating: 3.5, address: 'Sanctuary Entrance' },

    // --- KONDAPALLI (VIJAYAWADA OUTSKIRTS) ---
    { id: 'h_kon_1', name: 'Hotel Marg Krishnaaya', type: 'HOTEL', lat: 16.5062, lon: 80.6480, rating: 4.3, address: 'Vijayawada (20km from Fort)' }, 
    { id: 'r_kon_1', name: 'Kondapalli Tiffins', type: 'RESTAURANT', lat: 16.6150, lon: 80.5350, rating: 4.0, address: 'Kondapalli Village' },

    // --- KONDAGATTU ---
    { id: 'h_kgt_1', name: 'Haritha Hotel Kondagattu', type: 'HOTEL', lat: 18.6450, lon: 78.9050, rating: 3.8, address: 'Near Temple, Kondagattu' },
    { id: 'r_kgt_1', name: 'Anjaneya Prasadam', type: 'RESTAURANT', lat: 18.6420, lon: 78.9030, rating: 4.5, address: 'Temple Premises' },

    // --- EMERGENCY (HYD) ---
    { id: 'e_hyd_1', name: 'Osmania General Hospital', type: 'HOSPITAL', lat: 17.3728, lon: 78.4750, rating: 3.8, address: 'Afzal Gunj, Hyderabad' },
    { id: 'e_hyd_2', name: 'Apollo Hospitals', type: 'HOSPITAL', lat: 17.4181, lon: 78.4126, rating: 4.9, address: 'Jubilee Hills, Hyderabad' },
    { id: 'p_hyd_1', name: 'Charminar Police Station', type: 'POLICE', lat: 17.3620, lon: 78.4750, address: 'Charminar, Hyderabad' },
    { id: 'p_hyd_2', name: 'Begumpet Police Station', type: 'POLICE', lat: 17.4350, lon: 78.4600, address: 'Begumpet, Hyderabad' },
    
    // --- EMERGENCY (WARANGAL) ---
    { id: 'e_wgl_1', name: 'MGM Hospital', type: 'HOSPITAL', lat: 17.9650, lon: 79.6050, rating: 3.5, address: 'MGM Circle, Warangal' },
    { id: 'p_wgl_1', name: 'Warangal Police HQ', type: 'POLICE', lat: 17.9600, lon: 79.6000, address: 'Subedari, Warangal' }
];

export const BADGES: Badge[] = [
    { id: 'explorer', name: 'Novice Explorer', icon: '🧭', description: 'Visit 1 Monument', unlocked: false },
    { id: 'historian', name: 'Historian', icon: '📜', description: 'Visit 5 Monuments', unlocked: false },
    { id: 'guardian', name: 'Safety Guardian', icon: '🛡️', description: 'Report a safety issue', unlocked: false },
    { id: 'royal', name: 'Royal Guest', icon: '👑', description: 'Visit a Palace', unlocked: false }
];

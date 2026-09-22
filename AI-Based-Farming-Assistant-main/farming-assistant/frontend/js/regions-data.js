/**
 * Indian states/UT — names for display (hi + en minimum; other langs fall back to en).
 * Districts: sample lists; expand with official data as needed.
 */
window.REGIONS = {
  states: [
    { code: "AP", en: "Andhra Pradesh", hi: "आंध्र प्रदेश" },
    { code: "AR", en: "Arunachal Pradesh", hi: "अरुणाचल प्रदेश" },
    { code: "AS", en: "Assam", hi: "असम" },
    { code: "BR", en: "Bihar", hi: "बिहार" },
    { code: "CT", en: "Chhattisgarh", hi: "छत्तीसगढ़" },
    { code: "GA", en: "Goa", hi: "गोआ" },
    { code: "GJ", en: "Gujarat", hi: "गुजरात" },
    { code: "HR", en: "Haryana", hi: "हरियाणा" },
    { code: "HP", en: "Himachal Pradesh", hi: "हिमाचल प्रदेश" },
    { code: "JH", en: "Jharkhand", hi: "झारखंड" },
    { code: "KA", en: "Karnataka", hi: "कर्नाटक" },
    { code: "KL", en: "Kerala", hi: "केरल" },
    { code: "MP", en: "Madhya Pradesh", hi: "मध्य प्रदेश" },
    { code: "MH", en: "Maharashtra", hi: "महाराष्ट्र" },
    { code: "MN", en: "Manipur", hi: "मणिपुर" },
    { code: "ML", en: "Meghalaya", hi: "मेघालय" },
    { code: "MZ", en: "Mizoram", hi: "मिजोरम" },
    { code: "NL", en: "Nagaland", hi: "नागालैंड" },
    { code: "OR", en: "Odisha", hi: "ओडिशा" },
    { code: "PB", en: "Punjab", hi: "पंजाब" },
    { code: "RJ", en: "Rajasthan", hi: "राजस्थान" },
    { code: "SK", en: "Sikkim", hi: "सिक्किम" },
    { code: "TN", en: "Tamil Nadu", hi: "तमिलनाडु" },
    { code: "TG", en: "Telangana", hi: "तेलंगाना" },
    { code: "TR", en: "Tripura", hi: "त्रिपुरा" },
    { code: "UP", en: "Uttar Pradesh", hi: "उत्तर प्रदेश" },
    { code: "UK", en: "Uttarakhand", hi: "उत्तराखंड" },
    { code: "WB", en: "West Bengal", hi: "पश्चिम बंगाल" },
    { code: "AN", en: "Andaman and Nicobar", hi: "अंडमान निकोबार" },
    { code: "CH", en: "Chandigarh", hi: "चंडीगढ़" },
    { code: "DN", en: "Dadra and Nagar Haveli and Daman and Diu", hi: "दादरा नगर हवेली व दमन दीव" },
    { code: "DL", en: "Delhi", hi: "दिल्ली" },
    { code: "JK", en: "Jammu and Kashmir", hi: "जम्मू कश्मीर" },
    { code: "LA", en: "Ladakh", hi: "लद्दाख" },
    { code: "LD", en: "Lakshadweep", hi: "लक्षद्वीप" },
    { code: "PY", en: "Puducherry", hi: "पुदुचेरी" },
  ],
  districts: {
    PB: ["Ludhiana", "Amritsar", "Patiala", "Bathinda", "Jalandhar"],
    UP: ["Lucknow", "Kanpur", "Varanasi", "Prayagraj", "Gorakhpur"],
    MH: ["Pune", "Nagpur", "Nashik", "Aurangabad", "Kolhapur"],
    GJ: ["Ahmedabad", "Surat", "Vadodara", "Rajkot", "Bhavnagar"],
    RJ: ["Jaipur", "Jodhpur", "Udaipur", "Kota", "Ajmer"],
    TG: ["Hyderabad", "Warangal", "Nizamabad", "Karimnagar", "Khammam"],
    TN: ["Chennai", "Coimbatore", "Madurai", "Tiruchirappalli", "Salem"],
    KA: ["Bengaluru", "Mysuru", "Hubli", "Mangaluru", "Belagavi"],
    KL: ["Kochi", "Thiruvananthapuram", "Kozhikode", "Thrissur", "Kollam"],
    WB: ["Kolkata", "Howrah", "Darjeeling", "Siliguri", "Asansol"],
    BR: ["Patna", "Gaya", "Muzaffarpur", "Bhagalpur", "Darbhanga"],
    AS: ["Guwahati", "Dibrugarh", "Jorhat", "Silchar", "Tezpur"],
    OR: ["Bhubaneswar", "Cuttack", "Puri", "Sambalpur", "Rourkela"],
    AP: ["Visakhapatnam", "Vijayawada", "Guntur", "Nellore", "Kurnool"],
    CT: ["Raipur", "Bilaspur", "Durg", "Korba", "Rajnandgaon"],
    HR: ["Gurgaon", "Faridabad", "Panipat", "Hisar", "Rohtak"],
    DL: ["Central Delhi", "New Delhi", "North West Delhi", "South Delhi"],
  },
};

window.getStateLabel = function (state, lang) {
  const l = lang || localStorage.getItem("selectedLanguage") || "hi";
  if (l === "hi" || l === "mr" || l === "bn" || l === "ne") return state.hi || state.en;
  return state.en;
};

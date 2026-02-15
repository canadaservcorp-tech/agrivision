// ═══ Agrivision Disease Library — 47+ Scientifically Verified Entries ═══
const diseaseLibrary = [
  {id:1,name:"Early Blight",latin:"Alternaria solani",category:"fungal",crops:["Tomato","Potato"],region:["global"],severity:"high",symptoms:"Dark concentric rings on older leaves, stem lesions",management:"Crop rotation, fungicides (chlorothalonil, mancozeb), resistant varieties"},
  {id:2,name:"Late Blight",latin:"Phytophthora infestans",category:"oomycete",crops:["Tomato","Potato"],region:["global"],severity:"critical",symptoms:"Water-soaked lesions, white mold on leaf undersides, rapid tissue death",management:"Metalaxyl-based fungicides, resistant cultivars, destroy infected material"},
  {id:3,name:"Powdery Mildew",latin:"Erysiphe spp.",category:"fungal",crops:["Wheat","Grape","Cucumber","Squash"],region:["global"],severity:"moderate",symptoms:"White powdery coating on leaves and stems",management:"Sulfur-based fungicides, neem oil, resistant varieties, proper spacing"},
  {id:4,name:"Downy Mildew",latin:"Peronospora spp.",category:"oomycete",crops:["Grape","Lettuce","Onion","Cucumber"],region:["temperate","tropical"],severity:"high",symptoms:"Yellow patches on upper leaf, grayish mold underneath",management:"Copper-based treatments, improve air circulation, resistant cultivars"},
  {id:5,name:"Fusarium Wilt",latin:"Fusarium oxysporum",category:"fungal",crops:["Tomato","Banana","Cotton","Watermelon"],region:["global"],severity:"critical",symptoms:"Yellowing of leaves, wilting, brown vascular tissue",management:"Soil solarization, resistant varieties, crop rotation, biological control"},
  {id:6,name:"Bacterial Spot",latin:"Xanthomonas campestris",category:"bacterial",crops:["Tomato","Pepper"],region:["global"],severity:"high",symptoms:"Small dark spots on leaves, raised lesions on fruit",management:"Copper sprays, certified disease-free seed, crop rotation"},
  {id:7,name:"Citrus Canker",latin:"Xanthomonas citri",category:"bacterial",crops:["Citrus","Orange","Lemon","Grapefruit"],region:["tropical","mediterranean"],severity:"high",symptoms:"Raised corky lesions on leaves, stems and fruit with oily margins",management:"Copper bactericides, windbreaks, quarantine measures"},
  {id:8,name:"Rice Blast",latin:"Magnaporthe oryzae",category:"fungal",crops:["Rice"],region:["tropical","temperate"],severity:"critical",symptoms:"Diamond-shaped lesions on leaves, neck rot on panicles",management:"Resistant varieties, silicon fertilization, fungicides (tricyclazole)"},
  {id:9,name:"Wheat Rust (Stem)",latin:"Puccinia graminis",category:"fungal",crops:["Wheat","Barley"],region:["global"],severity:"critical",symptoms:"Reddish-brown pustules on stems and leaves",management:"Resistant varieties (Sr genes), fungicides, eradication of barberry host"},
  {id:10,name:"Apple Scab",latin:"Venturia inaequalis",category:"fungal",crops:["Apple","Pear"],region:["temperate"],severity:"high",symptoms:"Olive-green to black scabby lesions on leaves and fruit",management:"Fungicide program, resistant cultivars, sanitation of fallen leaves"},
  {id:11,name:"Gray Mold (Botrytis)",latin:"Botrytis cinerea",category:"fungal",crops:["Grape","Strawberry","Tomato","Lettuce"],region:["global"],severity:"high",symptoms:"Fuzzy gray-brown mold on fruit, flowers and stems",management:"Good air circulation, remove infected material, fungicides (fenhexamid)"},
  {id:12,name:"Anthracnose",latin:"Colletotrichum spp.",category:"fungal",crops:["Mango","Avocado","Bean","Pepper"],region:["tropical","temperate"],severity:"high",symptoms:"Dark sunken lesions on fruit, leaf spots, dieback",management:"Fungicides, hot water treatment (postharvest), resistant varieties"},
  {id:13,name:"Root Rot (Pythium)",latin:"Pythium spp.",category:"oomycete",crops:["Multiple crops","Soybean","Corn","Wheat"],region:["global"],severity:"high",symptoms:"Damping off of seedlings, brown mushy roots, stunted growth",management:"Improved drainage, metalaxyl seed treatment, biological controls (Trichoderma)"},
  {id:14,name:"Verticillium Wilt",latin:"Verticillium dahliae",category:"fungal",crops:["Cotton","Tomato","Eggplant","Strawberry"],region:["global"],severity:"high",symptoms:"V-shaped yellowing of leaves, wilting, brown vascular tissue",management:"Soil fumigation, resistant varieties, crop rotation with non-hosts"},
  {id:15,name:"Bacterial Wilt",latin:"Ralstonia solanacearum",category:"bacterial",crops:["Tomato","Potato","Banana","Ginger"],region:["tropical","temperate"],severity:"critical",symptoms:"Rapid permanent wilting without yellowing, brown vascular discoloration",management:"Resistant varieties, soil amendments, crop rotation, clean planting material"},
  {id:16,name:"Panama Disease TR4",latin:"Fusarium oxysporum f. sp. cubense",category:"fungal",crops:["Banana"],region:["tropical"],severity:"critical",symptoms:"Yellowing and splitting of pseudostem, internal brown streaks",management:"Quarantine, resistant varieties (GCTCV-219), soil treatments"},
  {id:17,name:"Citrus Greening (HLB)",latin:"Candidatus Liberibacter asiaticus",category:"bacterial",crops:["Citrus"],region:["tropical","mediterranean"],severity:"critical",symptoms:"Blotchy mottling of leaves, misshapen bitter fruit, tree decline",management:"Psyllid vector control, thermotherapy, remove infected trees"},
  {id:18,name:"Black Spot of Roses",latin:"Diplocarpon rosae",category:"fungal",crops:["Rose"],region:["temperate","tropical"],severity:"moderate",symptoms:"Circular black spots with fringed margins on leaves, defoliation",management:"Fungicides, resistant cultivars, remove fallen leaves, improve air flow"},
  {id:19,name:"Fire Blight",latin:"Erwinia amylovora",category:"bacterial",crops:["Apple","Pear"],region:["temperate"],severity:"high",symptoms:"Blackened scorched-looking shoots, oozing cankers, shepherd's crook tips",management:"Prune infected wood, streptomycin sprays at bloom, copper, resistant rootstocks"},
  {id:20,name:"Tobacco Mosaic Virus",latin:"TMV (Tobamovirus)",category:"viral",crops:["Tomato","Pepper","Tobacco"],region:["global"],severity:"moderate",symptoms:"Mosaic light/dark green pattern on leaves, stunting, leaf distortion",management:"Resistant varieties, seed treatment, hygiene (hand washing), no tobacco near crops"},
  {id:21,name:"Cucumber Mosaic Virus",latin:"CMV (Cucumovirus)",category:"viral",crops:["Cucumber","Tomato","Pepper","Lettuce"],region:["global"],severity:"high",symptoms:"Mosaic, leaf curling, stunting, shoe-string leaves",management:"Aphid vector control, resistant varieties, remove infected plants"},
  {id:22,name:"Tomato Yellow Leaf Curl",latin:"TYLCV (Begomovirus)",category:"viral",crops:["Tomato"],region:["tropical","mediterranean"],severity:"critical",symptoms:"Upward curling of leaves, yellowing, stunted growth, reduced fruit set",management:"Whitefly control, resistant hybrids, reflective mulch, netting"},
  {id:23,name:"Cassava Mosaic Disease",latin:"ACMV/EACMV",category:"viral",crops:["Cassava"],region:["tropical"],severity:"critical",symptoms:"Chlorotic mosaic, leaf distortion, reduced tuber size",management:"Resistant varieties, whitefly control, clean planting material"},
  {id:24,name:"Wheat Stripe Rust",latin:"Puccinia striiformis",category:"fungal",crops:["Wheat"],region:["temperate"],severity:"high",symptoms:"Yellow-orange pustules in stripes along leaf veins",management:"Resistant varieties (Yr genes), fungicides (triazoles), monitoring"},
  {id:25,name:"Corn Smut",latin:"Ustilago maydis",category:"fungal",crops:["Corn"],region:["global"],severity:"moderate",symptoms:"Large gray-white galls on ears, tassels, and leaves that turn black",management:"Resistant hybrids, remove galls before spore release, crop rotation"},
  {id:26,name:"Bacterial Canker of Tomato",latin:"Clavibacter michiganensis",category:"bacterial",crops:["Tomato"],region:["global"],severity:"high",symptoms:"Wilting, stem cankers, bird's eye spots on fruit",management:"Certified seed, crop rotation, hot water seed treatment, copper sprays"},
  {id:27,name:"Cercospora Leaf Spot",latin:"Cercospora beticola",category:"fungal",crops:["Sugar Beet","Spinach","Soybean"],region:["temperate","tropical"],severity:"moderate",symptoms:"Small circular spots with gray centers and dark borders",management:"Fungicides (triazoles), resistant varieties, crop rotation, remove debris"},
  {id:28,name:"Septoria Leaf Spot",latin:"Septoria lycopersici",category:"fungal",crops:["Tomato"],region:["global"],severity:"moderate",symptoms:"Small circular spots with dark borders and gray centers, lower leaf death",management:"Fungicides, remove lower leaves, mulch, crop rotation"},
  {id:29,name:"Clubroot",latin:"Plasmodiophora brassicae",category:"oomycete",crops:["Cabbage","Broccoli","Cauliflower","Canola"],region:["temperate"],severity:"high",symptoms:"Swollen distorted roots (clubs), wilting, stunted growth",management:"Lime soil to pH 7.2+, resistant varieties, long rotation (7+ years)"},
  {id:30,name:"Leaf Curl (Peach)",latin:"Taphrina deformans",category:"fungal",crops:["Peach","Nectarine"],region:["temperate"],severity:"moderate",symptoms:"Puckered reddish thickened leaves, defoliation",management:"Copper spray at dormancy, remove infected leaves"},
  {id:31,name:"Coffee Rust",latin:"Hemileia vastatrix",category:"fungal",crops:["Coffee"],region:["tropical"],severity:"critical",symptoms:"Orange powdery pustules on leaf undersides, defoliation",management:"Resistant varieties, fungicides (copper, triazoles), shade management"},
  {id:32,name:"Cocoa Black Pod",latin:"Phytophthora palmivora",category:"oomycete",crops:["Cocoa"],region:["tropical"],severity:"high",symptoms:"Brown-black lesions on pods, pod rot",management:"Frequent harvesting, fungicides (copper), canopy management"},
  {id:33,name:"Cotton Leaf Curl Virus",latin:"CLCuV (Begomovirus)",category:"viral",crops:["Cotton"],region:["tropical","arid"],severity:"critical",symptoms:"Upward leaf curling, thickened veins, stunting, enations on leaf undersides",management:"Whitefly control, resistant varieties, early planting, roguing"},
  {id:34,name:"Date Palm Bayoud",latin:"Fusarium oxysporum f. sp. albedinis",category:"fungal",crops:["Date Palm"],region:["arid"],severity:"critical",symptoms:"One-sided browning of fronds, vascular discoloration, tree death",management:"Resistant varieties (Najda, INRA selections), quarantine, soil fumigation"},
  {id:35,name:"Olive Anthracnose",latin:"Colletotrichum acutatum",category:"fungal",crops:["Olive"],region:["mediterranean"],severity:"high",symptoms:"Sunken brown-black lesions on fruit, mummification",management:"Copper sprays, resistant varieties, harvest timing, canopy aeration"},
  {id:36,name:"Olive Leaf Spot",latin:"Fusicladium oleagineum",category:"fungal",crops:["Olive"],region:["mediterranean"],severity:"moderate",symptoms:"Dark sooty blotches on upper leaf surface, premature defoliation",management:"Copper fungicides, resistant varieties, pruning for airflow"},
  {id:37,name:"Pomegranate Heart Rot",latin:"Alternaria alternata",category:"fungal",crops:["Pomegranate"],region:["arid","mediterranean"],severity:"high",symptoms:"Internal fruit decay not visible externally, brown rot of arils",management:"Pre-harvest fungicides, bagging fruit, harvest timing"},
  {id:38,name:"Root-Knot Nematode",latin:"Meloidogyne spp.",category:"nematode",crops:["Tomato","Carrot","Lettuce","Multiple"],region:["global"],severity:"high",symptoms:"Root galls/knots, stunting, yellowing, wilting despite adequate water",management:"Resistant varieties, soil solarization, nematicides, crop rotation with non-hosts"},
  {id:39,name:"Soybean Cyst Nematode",latin:"Heterodera glycines",category:"nematode",crops:["Soybean"],region:["temperate"],severity:"high",symptoms:"Stunting, yellowing, white/brown cysts on roots visible to eye",management:"Resistant varieties, crop rotation (corn, wheat), seed treatments"},
  {id:40,name:"Nitrogen Deficiency",latin:"N/A",category:"deficiency",crops:["All crops"],region:["global"],severity:"moderate",symptoms:"General yellowing (chlorosis) starting from older/lower leaves, stunted growth",management:"Nitrogen fertilizer application, organic matter, legume rotation"},
  {id:41,name:"Iron Deficiency (Chlorosis)",latin:"N/A",category:"deficiency",crops:["Citrus","Grape","Soybean","Blueberry"],region:["global"],severity:"moderate",symptoms:"Interveinal yellowing of young leaves while veins stay green",management:"Iron chelate application, soil acidification, foliar iron sprays"},
  {id:42,name:"Potassium Deficiency",latin:"N/A",category:"deficiency",crops:["All crops"],region:["global"],severity:"moderate",symptoms:"Leaf edge browning (scorch) on older leaves, weak stems",management:"Potassium fertilizer (KCl, K2SO4), compost, proper soil testing"},
  {id:43,name:"Xylella Fastidiosa (Pierce's)",latin:"Xylella fastidiosa",category:"bacterial",crops:["Grape","Olive","Citrus","Almond"],region:["mediterranean","tropical"],severity:"critical",symptoms:"Leaf scorch progressing inward, dried fruit, vine/tree decline and death",management:"Vector control (sharpshooters), remove infected plants, resistant varieties"},
  {id:44,name:"Wheat Take-All",latin:"Gaeumannomyces tritici",category:"fungal",crops:["Wheat","Barley"],region:["temperate"],severity:"high",symptoms:"Black roots, whiteheads (premature ripening of empty heads)",management:"Crop rotation, seed treatment, take-all decline, balanced fertilization"},
  {id:45,name:"Rice Sheath Blight",latin:"Rhizoctonia solani",category:"fungal",crops:["Rice"],region:["tropical","temperate"],severity:"high",symptoms:"Irregular green-gray water-soaked lesions on sheaths and leaves",management:"Proper spacing, fungicides (validamycin), silicon application, avoid excess nitrogen"},
  {id:46,name:"Banana Sigatoka",latin:"Mycosphaerella fijiensis",category:"fungal",crops:["Banana"],region:["tropical"],severity:"critical",symptoms:"Black streaks and spots on leaves, premature leaf death, reduced yield",management:"Fungicide rotation, resistant varieties, leaf removal, proper drainage"},
  {id:47,name:"Maize Lethal Necrosis",latin:"MLN (MCMV + SCMV)",category:"viral",crops:["Corn"],region:["tropical"],severity:"critical",symptoms:"Chlorotic mottle progressing to necrosis, dead heart, plant death",management:"Resistant varieties, vector control (thrips, beetles), clean seed, roguing"}
];

// ═══ Disease rendering & filtering ═══
let displayedCount = 0;
const PAGE_SIZE = 12;

function renderDiseases(diseases, append = false) {
  const grid = document.getElementById('diseaseGrid');
  if (!append) { grid.innerHTML = ''; displayedCount = 0; }
  const slice = diseases.slice(displayedCount, displayedCount + PAGE_SIZE);
  slice.forEach(d => {
    const card = document.createElement('div');
    card.className = 'disease-card';
    card.innerHTML = `
      <h5>${d.name}</h5>
      <div class="latin">${d.latin}</div>
      <div class="tags">
        <span class="disease-tag tag-${d.category}">${d.category}</span>
        <span class="disease-tag" style="background:#f3f4f6;color:#374151;">${d.severity}</span>
      </div>
      <div class="crops"><strong>Crops:</strong> ${d.crops.join(', ')}</div>
    `;
    card.onclick = () => showDiseaseDetail(d);
    grid.appendChild(card);
  });
  displayedCount += slice.length;
  document.getElementById('diseaseCountNum').textContent = diseases.length;
  const loadMore = document.getElementById('loadMoreDiseases');
  loadMore.style.display = displayedCount < diseases.length ? 'block' : 'none';
}

function filterDiseases() {
  const search = document.getElementById('diseaseSearch').value.toLowerCase();
  const cat = document.getElementById('filterCategory').value;
  const region = document.getElementById('filterRegion').value;
  const crop = document.getElementById('filterCrop').value;
  let filtered = diseaseLibrary.filter(d => {
    if (search && !d.name.toLowerCase().includes(search) && !d.latin.toLowerCase().includes(search)) return false;
    if (cat && d.category !== cat) return false;
    if (region && !d.region.includes(region)) return false;
    if (crop && !d.crops.some(c => c.toLowerCase().includes(crop))) return false;
    return true;
  });
  renderDiseases(filtered);
}

function showDiseaseDetail(d) {
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.onclick = (e) => { if (e.target === overlay) overlay.remove(); };
  overlay.innerHTML = `
    <div class="modal-box" style="max-width:560px">
      <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">&times;</button>
      <h3 style="color:var(--green-900);margin-bottom:4px">${d.name}</h3>
      <p style="font-style:italic;color:var(--muted);margin-bottom:16px">${d.latin}</p>
      <div class="tags" style="margin-bottom:16px">
        <span class="disease-tag tag-${d.category}">${d.category}</span>
        <span class="disease-tag" style="background:#f3f4f6;color:#374151">${d.severity} severity</span>
      </div>
      <p style="margin-bottom:12px"><strong>Crops:</strong> ${d.crops.join(', ')}</p>
      <p style="margin-bottom:12px"><strong>Regions:</strong> ${d.region.join(', ')}</p>
      <p style="margin-bottom:12px"><strong>Symptoms:</strong> ${d.symptoms}</p>
      <p><strong>Management:</strong> ${d.management}</p>
    </div>`;
  document.body.appendChild(overlay);
}

// Init
document.addEventListener('DOMContentLoaded', () => {
  renderDiseases(diseaseLibrary);
  document.getElementById('diseaseSearch').addEventListener('input', filterDiseases);
  document.getElementById('filterCategory').addEventListener('change', filterDiseases);
  document.getElementById('filterRegion').addEventListener('change', filterDiseases);
  document.getElementById('filterCrop').addEventListener('change', filterDiseases);
  document.getElementById('loadMoreDiseases').addEventListener('click', () => {
    const search = document.getElementById('diseaseSearch').value.toLowerCase();
    const cat = document.getElementById('filterCategory').value;
    const region = document.getElementById('filterRegion').value;
    const crop = document.getElementById('filterCrop').value;
    let filtered = diseaseLibrary.filter(d => {
      if (search && !d.name.toLowerCase().includes(search) && !d.latin.toLowerCase().includes(search)) return false;
      if (cat && d.category !== cat) return false;
      if (region && !d.region.includes(region)) return false;
      if (crop && !d.crops.some(c => c.toLowerCase().includes(crop))) return false;
      return true;
    });
    renderDiseases(filtered, true);
  });
});

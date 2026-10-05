// FoodCheck ingredient rules.
// Each rule: which concern it belongs to, the words that trigger it, how sure we are,
// and a plain-English note on where the ingredient comes from.
//   level "contains" = the ingredient is that thing (e.g. whey is milk)
//   level "maybe"    = the ingredient is sometimes made from that thing (e.g. mono- and diglycerides)

// Concerns a user can turn on. "group" is only for layout.
window.FC_CONCERNS = [
  { id: "milk", label: "Milk / dairy", group: "Allergies" },
  { id: "egg", label: "Eggs", group: "Allergies" },
  { id: "peanut", label: "Peanuts", group: "Allergies" },
  { id: "treenut", label: "Tree nuts", group: "Allergies" },
  { id: "soy", label: "Soy", group: "Allergies" },
  { id: "wheat", label: "Wheat / gluten", group: "Allergies" },
  { id: "fish", label: "Fish", group: "Allergies" },
  { id: "shellfish", label: "Shellfish", group: "Allergies" },
  { id: "sesame", label: "Sesame", group: "Allergies" },
  { id: "mustard", label: "Mustard", group: "Allergies" },
  { id: "sulfite", label: "Sulfites", group: "Allergies" },
  { id: "corn", label: "Corn", group: "Allergies" },
  { id: "vegetarian", label: "Vegetarian", group: "Diet & religion" },
  { id: "vegan", label: "Vegan", group: "Diet & religion" },
  { id: "eggless", label: "No eggs", group: "Diet & religion" },
  { id: "halal", label: "Halal", group: "Diet & religion" },
  { id: "kosher", label: "Kosher", group: "Diet & religion" },
  { id: "nobeef", label: "No beef (Hindu)", group: "Diet & religion" },
  { id: "nopork", label: "No pork", group: "Diet & religion" },
  { id: "jain", label: "Jain", group: "Diet & religion" },
  { id: "noalcohol", label: "No alcohol", group: "Diet & religion" },
];

// Concerns that inherit other concerns' rules (vegan also cares about everything vegetarian does, etc).
window.FC_IMPLIES = {
  vegan: ["vegetarian", "milk", "egg"],
  jain: ["vegetarian", "eggless"],
  eggless: ["egg"],
  halal: ["nopork"],
  kosher: ["nopork"],
};

// Shorthand for building rules.
function R(concerns, level, words, note, opts) {
  return Object.assign({ concerns, level, words, note }, opts || {});
}

const MEAT = ["vegetarian", "vegan", "jain"];
const PORK = ["nopork", "halal", "kosher", "vegetarian", "vegan", "jain"];
const BEEF = ["nobeef", "vegetarian", "vegan", "jain"];
const ANIMAL_MAYBE = ["vegetarian", "vegan", "jain", "halal", "kosher", "nobeef", "nopork"];

window.FC_RULES = [
  // ---------------- Milk ----------------
  R(["milk", "vegan"], "contains",
    ["milk", "milkfat", "milk fat", "whole milk", "skim milk", "nonfat milk", "milk powder", "milk solids", "buttermilk", "cream", "sour cream", "cheese", "butter", "butterfat", "butter oil", "ghee", "yogurt", "yoghurt", "kefir", "curd", "curds", "paneer", "custard", "half-and-half", "half and half", "ice cream"],
    "Dairy product made from cow's (or other animal) milk.",
    { exclude: ["coconut milk", "almond milk", "oat milk", "soy milk", "soymilk", "rice milk", "cashew milk", "coconut cream", "cocoa butter", "cacao butter", "shea butter", "peanut butter", "almond butter", "nut butter", "cashew butter", "sunflower butter", "seed butter", "apple butter", "cream of tartar", "cream of coconut", "milk thistle", "vegan cheese", "dairy-free", "dairy free", "non-dairy", "nondairy", "milk chocolate flavor", "butternut", "butterfly"] }),
  R(["milk", "vegan"], "contains",
    ["whey", "whey protein", "casein", "caseinate", "sodium caseinate", "calcium caseinate", "lactose", "lactalbumin", "lactoglobulin", "lactoferrin", "milk protein", "recaldent", "rennet casein", "galacto-oligosaccharides", "tagatose"],
    "Hidden milk ingredient. Whey, casein and lactose all come from milk, even when the label never says 'milk' in the ingredient name."),
  R(["milk"], "maybe",
    ["nougat", "lactic acid starter culture", "caramel color", "natural butter flavor", "artificial butter flavor", "high protein flour"],
    "Usually dairy-free in the US, but some versions are made with milk. Check with the maker if the allergy is severe."),
  R(["milk", "kosher"], "maybe", ["pareve", "parve"], "Marked pareve, which normally means no milk or meat. Shown for information.", { info: true }),

  // ---------------- Egg ----------------
  R(["egg", "vegan", "eggless"], "contains",
    ["egg", "eggs", "egg white", "egg whites", "egg yolk", "egg yolks", "whole egg", "dried egg", "egg powder", "albumin", "albumen", "ovalbumin", "ovomucoid", "ovomucin", "ovovitellin", "ovoglobulin", "livetin", "vitellin", "lysozyme", "meringue", "mayonnaise", "eggnog", "surimi"],
    "Comes from eggs. Albumin, lysozyme and the 'ovo-' words are egg proteins under another name.",
    { exclude: ["eggplant", "egg-free", "egg free", "eggless", "vegan mayonnaise", "egg replacer"] }),
  R(["egg", "vegan", "eggless"], "maybe",
    ["lecithin", "globulin", "silici albuminate", "simplesse", "fat substitute"],
    "Can be made from eggs. Lecithin is most often soy or sunflower in the US but can be egg yolk; check if it says which.",
    { exclude: ["soy lecithin", "soya lecithin", "sunflower lecithin", "canola lecithin", "rapeseed lecithin"] }),

  // ---------------- Peanut ----------------
  R(["peanut"], "contains",
    ["peanut", "peanuts", "peanut butter", "peanut oil", "peanut flour", "arachis oil", "arachis", "groundnut", "groundnuts", "goober", "goobers", "beer nuts", "monkey nuts", "mandelonas"],
    "Peanut or a peanut product under another name."),

  // ---------------- Tree nuts ----------------
  R(["treenut"], "contains",
    ["almond", "almonds", "cashew", "cashews", "pecan", "pecans", "walnut", "walnuts", "hazelnut", "hazelnuts", "filbert", "filberts", "pistachio", "pistachios", "macadamia", "brazil nut", "brazil nuts", "pine nut", "pine nuts", "pignoli", "pinon", "chestnut", "chestnuts", "praline", "marzipan", "almond paste", "gianduja", "nougat", "nut butter", "nut oil", "nut paste", "nutella", "amaretto", "frangipane", "shea nut", "beechnut", "hickory nut", "butternut", "nangai", "ginkgo"],
    "Tree nut, or a product (marzipan, praline, gianduja, nougat) usually made from tree nuts.",
    { exclude: ["water chestnut", "water chestnuts", "nutmeg", "butternut squash", "nut-free", "nut free", "almond flavor", "natural almond flavor"] }),
  R(["treenut"], "maybe", ["almond flavor", "natural almond flavor", "natural nut flavor", "coconut", "pesto"],
    "Almond flavor may come from real almonds or from apricot/peach pits. Pesto often contains pine nuts. The FDA no longer counts coconut as a tree nut, but some tree-nut-allergic people react to it."),

  // ---------------- Soy ----------------
  R(["soy"], "contains",
    ["soy", "soya", "soybean", "soybeans", "soy protein", "soy flour", "soy lecithin", "soya lecithin", "soy sauce", "tofu", "tempeh", "edamame", "miso", "natto", "okara", "shoyu", "tamari", "yuba", "textured vegetable protein", "tvp", "soy isolate"],
    "Made from soybeans.",
    { exclude: ["soy-free", "soy free"] }),
  R(["soy"], "maybe",
    ["hydrolyzed vegetable protein", "hydrolyzed plant protein", "vegetable protein", "vegetable broth", "vegetable gum", "vegetable starch", "vegetable oil", "lecithin", "mono and diglycerides", "mono- and diglycerides", "vitamin e", "tocopherols", "mixed tocopherols", "natural flavor", "natural flavors"],
    "Sometimes made from soy. Highly refined soybean oil and soy-based vitamin E are not required to be labeled as soy in the US; most soy-allergic people tolerate them, but check with a doctor.",
    { exclude: ["soy lecithin", "sunflower lecithin", "canola lecithin", "egg lecithin"] }),

  // ---------------- Wheat / gluten ----------------
  R(["wheat"], "contains",
    ["wheat", "wheat flour", "whole wheat", "enriched flour", "flour", "bleached flour", "unbleached flour", "all-purpose flour", "durum", "semolina", "spelt", "farina", "farro", "einkorn", "emmer", "kamut", "khorasan", "triticale", "bulgur", "couscous", "seitan", "wheat gluten", "vital wheat gluten", "gluten", "wheat starch", "graham", "barley", "barley malt", "malt", "malt extract", "malt syrup", "malt vinegar", "malted barley", "rye", "rye flour", "brewer's yeast", "panko", "breadcrumbs", "bread crumbs", "matzo", "matzah", "crackermeal", "orzo", "udon"],
    "Contains wheat or another gluten grain (barley, rye, malt).",
    { exclude: ["buckwheat", "rice flour", "almond flour", "coconut flour", "corn flour", "cornflour", "potato flour", "tapioca flour", "chickpea flour", "oat flour", "soy flour", "cassava flour", "sorghum flour", "gluten-free", "gluten free", "maltodextrin", "maltitol", "maltose", "malt-free"] }),
  R(["wheat"], "maybe",
    ["oats", "oat", "oat flour", "rolled oats", "modified food starch", "food starch", "dextrin", "hydrolyzed vegetable protein", "hydrolyzed plant protein", "seasoning", "spices", "natural flavor", "natural flavors", "soy sauce", "brown rice syrup", "caramel color"],
    "Can contain or be contaminated with wheat/gluten. In the US, modified food starch is usually corn, and must say 'wheat' if it is wheat; oats are often cross-contaminated unless labeled gluten-free.",
    { exclude: ["gluten-free oats", "gluten free oats", "tamari"] }),

  // ---------------- Fish ----------------
  R(["fish", "vegetarian", "vegan", "jain"], "contains",
    ["fish", "anchovy", "anchovies", "tuna", "salmon", "cod", "pollock", "tilapia", "sardine", "sardines", "mackerel", "herring", "trout", "halibut", "haddock", "catfish", "bass", "snapper", "swordfish", "fish sauce", "fish oil", "fish gelatin", "bonito", "katsuobushi", "dashi", "surimi", "worcestershire", "worcestershire sauce", "caesar dressing", "roe", "caviar", "isinglass", "omega-3 from fish"],
    "Fish or a fish-based ingredient. Worcestershire sauce and Caesar dressing usually contain anchovies; dashi is made from bonito fish; isinglass is fish bladder used to clarify drinks.",
    { exclude: ["vegan worcestershire", "fish-free"] }),
  R(["fish", "vegan", "vegetarian"], "maybe", ["omega-3", "omega 3", "dha", "epa", "vitamin d3"],
    "Omega-3 (DHA/EPA) is often from fish oil, sometimes from algae. Vitamin D3 is usually from sheep's wool lanolin or fish oil (not vegan) unless it says lichen or vegan."),

  // ---------------- Shellfish ----------------
  R(["shellfish", "vegetarian", "vegan", "jain", "kosher"], "contains",
    ["shrimp", "prawn", "prawns", "crab", "lobster", "crawfish", "crayfish", "krill", "langoustine", "scampi", "clam", "clams", "mussel", "mussels", "oyster", "oysters", "oyster sauce", "scallop", "scallops", "squid", "calamari", "octopus", "abalone", "snail", "escargot", "shellfish", "glucosamine", "chitosan"],
    "Shellfish or made from shellfish shells (glucosamine, chitosan). Not kosher.",
    { exclude: ["vegan oyster sauce", "mushroom oyster sauce", "oyster mushroom", "oyster mushrooms"] }),

  // ---------------- Sesame ----------------
  R(["sesame"], "contains",
    ["sesame", "sesame seed", "sesame seeds", "sesame oil", "tahini", "tahina", "benne", "benne seed", "gingelly", "gingelly oil", "til", "sesamol", "sesamolin", "halvah", "halva", "za'atar", "zaatar", "hummus", "gomasio", "furikake"],
    "Sesame or a dish/ingredient usually made with sesame (tahini, hummus, halvah, za'atar). Sesame became the 9th major US allergen in 2023."),

  // ---------------- Mustard / sulfites / corn ----------------
  R(["mustard"], "contains", ["mustard", "mustard seed", "mustard flour", "mustard oil", "dijon"],
    "Mustard. A major allergen in Canada and the EU, though not required to be called out on US labels."),
  R(["mustard"], "maybe", ["spices", "spice", "seasoning", "natural flavor", "natural flavors", "mayonnaise", "dressing"],
    "Spice blends and dressings in the US may include mustard without naming it."),
  R(["sulfite"], "contains",
    ["sulfite", "sulfites", "sulphite", "sulfur dioxide", "sulphur dioxide", "sodium bisulfite", "sodium metabisulfite", "potassium metabisulfite", "potassium bisulfite", "sodium sulfite", "e220", "e221", "e222", "e223", "e224", "e225", "e226", "e227", "e228"],
    "A sulfite preservative. Common in dried fruit, wine and some potato products."),
  R(["sulfite"], "maybe", ["dried apricots", "raisins", "wine", "vinegar", "lemon juice concentrate", "molasses"],
    "Often preserved with sulfites."),
  R(["corn"], "contains",
    ["corn", "cornstarch", "corn starch", "corn syrup", "high fructose corn syrup", "corn flour", "cornmeal", "corn meal", "maize", "hominy", "masa", "polenta", "grits", "corn oil", "popcorn"],
    "Made from corn."),
  R(["corn"], "maybe",
    ["dextrose", "maltodextrin", "dextrin", "glucose", "glucose syrup", "modified food starch", "food starch", "citric acid", "sorbitol", "xanthan gum", "caramel color", "vanilla extract", "ascorbic acid", "erythritol", "vinegar", "distilled vinegar"],
    "In the US this is usually made from corn."),

  // ---------------- Meat, poultry, animal parts (vegetarian) ----------------
  R(MEAT.concat(["halal", "kosher"]), "contains",
    ["chicken", "turkey", "duck", "goose", "lamb", "mutton", "goat", "veal", "venison", "bison", "rabbit", "meat", "meats", "poultry", "chicken fat", "chicken broth", "chicken stock", "chicken powder", "turkey broth", "bone broth", "meat broth", "meat extract", "meat stock", "liver", "pepperoni", "salami", "sausage", "jerky", "anchovy paste"],
    "Meat or poultry. For halal and kosher it also needs to be slaughtered the right way, which the label usually won't show unless certified.",
    { exclude: ["chicken-free", "meatless", "meat-free", "meat free", "plant-based meat", "imitation chicken flavor", "artificial chicken flavor", "vegetarian chicken"] }),
  R(BEEF.concat(["halal", "kosher"]), "contains",
    ["beef", "beef fat", "beef broth", "beef stock", "beef extract", "beef tallow", "tallow", "suet", "beef gelatin", "bovine", "oxtail", "corned beef", "pastrami", "veal"],
    "Beef or comes from cows. Tallow and suet are beef fat."),
  R(PORK, "contains",
    ["pork", "ham", "bacon", "lard", "pork fat", "pork rind", "pork rinds", "pancetta", "prosciutto", "chorizo", "pepperoni", "porcine", "pork gelatin", "pig", "swine", "speck", "guanciale", "carnitas", "chicharron", "pork broth"],
    "Pork or comes from pigs.",
    { exclude: ["turkey bacon", "turkey ham", "beef bacon", "bacon flavor", "imitation bacon", "bacon bits (soy)", "vegan bacon", "hamburger", "graham"] }),
  R(PORK.concat(["nobeef"]), "contains",
    ["gelatin", "gelatine", "collagen", "hydrolyzed collagen", "collagen peptides", "bone meal", "bone phosphate", "animal fat", "animal shortening", "animal protein", "marshmallow", "marshmallows", "aspic"],
    "Usually made from pig or cow skin and bones. Halal and kosher gelatin exist but must be labeled or certified; fish gelatin and agar are the main alternatives.",
    { exclude: ["fish gelatin", "agar", "agar-agar", "vegan gelatin", "plant-based gelatin", "kosher gelatin (fish)", "vegan marshmallow"] }),
  R(MEAT.concat(["halal", "kosher", "nobeef"]), "contains",
    ["rennet", "animal rennet", "calf rennet", "pepsin", "chymosin (animal)"],
    "Rennet is a stomach enzyme from calves, used to make cheese. 'Microbial' or 'vegetable' rennet is vegetarian.",
    { exclude: ["microbial rennet", "vegetable rennet", "vegetarian rennet", "non-animal rennet"] }),
  R(MEAT.concat(["kosher", "halal"]), "contains",
    ["carmine", "cochineal", "carminic acid", "natural red 4", "crimson lake", "e120"],
    "Red color made from crushed cochineal insects. Not vegetarian; not kosher; many halal authorities avoid it."),
  R(["vegan", "jain", "kosher"], "contains",
    ["shellac", "confectioner's glaze", "confectioners glaze", "resinous glaze", "pharmaceutical glaze", "lac resin", "e904"],
    "Shiny coating made from lac bug secretions (insects). Common on candy and coated nuts."),
  R(PORK.concat(["nobeef"]), "contains",
    ["l-cysteine", "cysteine", "l-cystine", "e920", "e921"],
    "Dough conditioner that is often made from duck feathers or human/hog hair. Synthetic versions exist but are rarely labeled as such."),
  R(ANIMAL_MAYBE, "maybe",
    ["mono and diglycerides", "mono- and diglycerides", "monoglycerides", "diglycerides", "glycerides", "stearic acid", "stearate", "magnesium stearate", "calcium stearate", "glycerin", "glycerine", "glycerol", "polysorbate", "polysorbate 60", "polysorbate 80", "sodium stearoyl lactylate", "calcium stearoyl lactylate", "lipase", "enzymes", "enzyme", "e471", "e472", "e422", "e570"],
    "Emulsifiers and enzymes that can be made from plant oils or from beef/pork fat. Labels rarely say which. Look for a vegetarian, halal or kosher symbol, or ask the brand."),
  R(ANIMAL_MAYBE.concat(["noalcohol"]), "maybe",
    ["natural flavor", "natural flavors", "natural flavoring", "natural flavorings", "natural and artificial flavor", "natural & artificial flavor", "flavoring", "smoke flavor", "natural smoke flavor"],
    "US 'natural flavors' can legally come from meat, dairy, egg, fish or plants, and are often carried in alcohol. Ask the brand if this matters to you."),
  R(["vegan", "nobeef"], "maybe",
    ["sugar", "cane sugar", "powdered sugar", "brown sugar", "confectioners sugar", "icing sugar"],
    "Some US cane sugar is whitened with bone char (charred cattle bones). Beet sugar, organic sugar and certified-vegan sugar are not.",
    { exclude: ["organic cane sugar", "organic sugar", "beet sugar", "coconut sugar", "date sugar", "maple sugar", "sugar alcohol", "sugar-free", "sugar free", "no sugar"], quiet: true }),
  R(["vegan", "jain"], "contains",
    ["honey", "beeswax", "royal jelly", "propolis", "bee pollen", "lanolin", "e901"],
    "Animal product (from bees, or from sheep's wool for lanolin). Not vegan; Jains also avoid honey.",
    { exclude: ["honeydew", "honey flavor", "honeycomb cereal"] }),
  R(["vegan", "vegetarian"], "maybe", ["castoreum"], "Flavoring from beaver glands. Rarely used today."),

  // ---------------- Alcohol ----------------
  R(["noalcohol", "halal"], "contains",
    ["alcohol", "ethanol", "ethyl alcohol", "wine", "red wine", "white wine", "cooking wine", "mirin", "sake", "beer", "ale", "lager", "stout", "rum", "brandy", "bourbon", "whiskey", "whisky", "vodka", "liqueur", "kirsch", "cognac", "sherry", "marsala", "champagne", "vanilla extract", "pure vanilla extract", "spirits"],
    "Contains alcohol, or an extract usually made in alcohol (pure vanilla extract is about 35% alcohol, though very little remains in the food).",
    { exclude: ["sugar alcohol", "sugar alcohols", "cetyl alcohol", "alcohol-free", "non-alcoholic", "wine vinegar", "red wine vinegar", "white wine vinegar", "rice wine vinegar", "cetearyl alcohol", "benzyl alcohol", "rum flavor", "imitation vanilla", "vanilla extract (alcohol-free)", "ale-8"] }),
  R(["noalcohol", "halal"], "maybe", ["wine vinegar", "red wine vinegar", "white wine vinegar", "rum flavor", "brandy flavor"],
    "Made from wine, or flavored to taste like alcohol. Most halal authorities accept wine vinegar, some do not."),
  R(["kosher"], "maybe", ["grape juice", "grape", "grapes", "wine vinegar", "red wine vinegar", "white wine vinegar"],
    "Kosher rules restrict grape juice and wine products that weren't made under kosher supervision. Look for a kosher symbol."),

  // ---------------- Jain root vegetables etc ----------------
  R(["jain"], "contains",
    ["onion", "onions", "onion powder", "dehydrated onion", "garlic", "garlic powder", "dehydrated garlic", "potato", "potatoes", "potato starch", "potato flakes", "carrot", "carrots", "beet", "beets", "beetroot", "radish", "turnip", "ginger", "turmeric", "sweet potato", "yam", "leek", "leeks", "shallot", "shallots", "scallion", "scallions", "chives", "mushroom", "mushrooms", "yeast extract", "yeast"],
    "Root vegetable, onion/garlic family, mushroom or yeast, which strict Jain diets avoid.",
    { exclude: ["beet sugar"] }),
  R(["jain"], "maybe", ["spices", "seasoning", "vegetable powder", "dehydrated vegetables", "vegetable broth", "natural flavor", "natural flavors"],
    "Spice and vegetable blends often include onion or garlic without naming them."),
];

// Open Food Facts allergen tag -> our concern id.
window.FC_OFF_TAGS = {
  "en:milk": "milk", "en:eggs": "egg", "en:peanuts": "peanut", "en:nuts": "treenut", "en:soybeans": "soy",
  "en:gluten": "wheat", "en:fish": "fish", "en:crustaceans": "shellfish", "en:molluscs": "shellfish",
  "en:sesame-seeds": "sesame", "en:mustard": "mustard", "en:sulphur-dioxide-and-sulphites": "sulfite",
};

// Keyword → category name mapping, checked in order (first match wins)
const RULES: [string, string[]][] = [
	['Meat', ['chicken', 'beef', 'pork', 'lamb', 'turkey', 'fish', 'salmon', 'tuna',
		'shrimp', 'prawn', 'steak', 'mince', 'ground beef', 'sausage', 'bacon', 'ham',
		'duck', 'veal', 'cod', 'tilapia', 'crab', 'lobster', 'scallop', 'anchovy', 'sardine']],
	['Dairy', ['milk', 'cheese', 'yogurt', 'yoghurt', 'butter', 'cream', 'egg', 'eggs',
		'ghee', 'curd', 'kefir', 'brie', 'cheddar', 'mozzarella', 'parmesan', 'feta',
		'cottage cheese', 'sour cream', 'whipping cream', 'heavy cream']],
	['Produce', ['apple', 'banana', 'orange', 'lemon', 'lime', 'grape', 'strawberry',
		'blueberry', 'raspberry', 'blackberry', 'tomato', 'potato', 'onion', 'garlic',
		'carrot', 'broccoli', 'spinach', 'lettuce', 'kale', 'pepper', 'cucumber',
		'zucchini', 'avocado', 'mango', 'pineapple', 'watermelon', 'melon', 'peach',
		'pear', 'plum', 'cherry', 'mushroom', 'celery', 'asparagus', 'corn', 'ginger',
		'cilantro', 'parsley', 'basil', 'mint', 'herb', 'cabbage', 'beet',
		'radish', 'fennel', 'leek', 'scallion', 'spring onion']],
	['Bakery', ['bread', 'toast', 'bagel', 'muffin', 'croissant', 'bun', 'roll',
		'pita', 'tortilla', 'wrap', 'naan', 'roti', 'loaf', 'sourdough', 'baguette']],
	['Frozen', ['frozen', 'ice cream', 'gelato', 'sorbet', 'popsicle']],
	['Canned', ['canned', 'tinned', 'tin of', 'can of']],
	['Condiments', ['ketchup', 'mustard', 'mayo', 'mayonnaise', 'vinegar', 'soy sauce',
		'hot sauce', 'sriracha', 'olive oil', 'vegetable oil', 'canola oil', 'sesame oil',
		'honey', 'jam', 'jelly', 'peanut butter', 'tahini', 'salsa', 'dressing',
		'maple syrup', 'fish sauce', 'oyster sauce', 'worcestershire', 'hoisin',
		'bbq sauce', 'teriyaki', 'coconut oil']],
	['Dry', ['rice', 'pasta', 'noodle', 'flour', 'sugar', 'oat', 'oatmeal', 'cereal',
		'quinoa', 'lentil', 'chickpea', 'black bean', 'kidney bean', 'couscous',
		'barley', 'cornmeal', 'breadcrumb', 'panko', 'cocoa', 'baking powder',
		'baking soda', 'yeast', 'salt', 'pepper', 'spice', 'cumin', 'paprika',
		'cinnamon', 'turmeric', 'oregano', 'thyme', 'rosemary', 'bay leaf']],
	['Snacks', ['chip', 'chips', 'cracker', 'popcorn', 'pretzel', 'granola bar',
		'almond', 'cashew', 'walnut', 'pecan', 'pistachio', 'mixed nuts', 'trail mix',
		'chocolate', 'candy', 'cookie', 'biscuit', 'juice', 'soda', 'sparkling water',
		'coffee', 'tea', 'protein bar', 'energy bar', 'dried fruit', 'raisin']],
];

// Returns the matching category display name, or 'Other' if no match found.
export function guessCategory(name: string): string {
	const lower = name.toLowerCase();
	for (const [categoryName, keywords] of RULES) {
		if (keywords.some((k) => lower.includes(k))) return categoryName;
	}
	return 'Other';
}

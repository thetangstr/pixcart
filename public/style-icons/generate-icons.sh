#!/bin/bash

# Create style icons directory if it doesn't exist
mkdir -p public/style-icons

# Download famous paintings as style references
echo "📥 Downloading style reference images..."

# Classic Portrait - Use a classic pet portrait
cp public/gallery/demo_1_painting.jpg public/style-icons/classic.jpg 2>/dev/null || \
  curl -s "https://upload.wikimedia.org/wikipedia/commons/thumb/3/30/Vulpes_vulpes_ssp_fulvus.jpg/320px-Vulpes_vulpes_ssp_fulvus.jpg" -o public/style-icons/classic.jpg

# Van Gogh Style - Sunflowers
curl -s "https://upload.wikimedia.org/wikipedia/commons/thumb/4/46/Vincent_Willem_van_Gogh_127.jpg/320px-Vincent_Willem_van_Gogh_127.jpg" -o public/style-icons/vangogh-temp.jpg

# Monet Style - Water Lilies
curl -s "https://upload.wikimedia.org/wikipedia/commons/thumb/a/aa/Claude_Monet_-_Water_Lilies_-_1906%2C_Ryerson.jpg/320px-Claude_Monet_-_Water_Lilies_-_1906%2C_Ryerson.jpg" -o public/style-icons/monet-temp.jpg

# Modern/Abstract - Colorful abstract
curl -s "https://upload.wikimedia.org/wikipedia/en/thumb/1/1c/Composition_A_by_Piet_Mondrian_Galleria_Nazionale_d%27Arte_Moderna_e_Contemporanea.jpg/320px-Composition_A_by_Piet_Mondrian_Galleria_Nazionale_d%27Arte_Moderna_e_Contemporanea.jpg" -o public/style-icons/modern-temp.jpg

echo "✅ Style icons ready in public/style-icons/"
import { z } from 'zod';
import { tool } from 'ai';
import { createScopedLogger } from '~/utils/logger';

const logger = createScopedLogger('tool:stitch-design');

const STITCH_MCP_URL = 'https://stitch.googleapis.com/mcp';

interface DesignResult {
  option: number;
  title: string;
  imageUrl: string;
  htmlUrl: string;
  screenId: string;
}

interface DesignSystemResult {
  name: string;
  palette: Array<{ label: string; hex: string }>;
  typography: {
    style: string;
    fonts: string[];
  };
  features: string[];
}

const PALETTE_SEEDS: Record<string, Array<{ label: string; hex: string }>> = {
  blue: [
    { label: 'Primary', hex: '#1E40AF' },
    { label: 'Secondary', hex: '#3B82F6' },
    { label: 'Accent', hex: '#60A5FA' },
    { label: 'Dark', hex: '#0F172A' },
    { label: 'Light', hex: '#EFF6FF' },
    { label: 'Surface', hex: '#F8FAFC' },
    { label: 'Text', hex: '#1E293B' },
    { label: 'Muted', hex: '#94A3B8' },
  ],
  warm: [
    { label: 'Primary', hex: '#C4632A' },
    { label: 'Secondary', hex: '#F5E6DC' },
    { label: 'Accent', hex: '#B5572A' },
    { label: 'Dark', hex: '#1A1A2E' },
    { label: 'Light', hex: '#FFF8F0' },
    { label: 'Surface', hex: '#FDF6F0' },
    { label: 'Text', hex: '#292524' },
    { label: 'Muted', hex: '#A8A29E' },
  ],
  green: [
    { label: 'Primary', hex: '#2D6A4F' },
    { label: 'Secondary', hex: '#52B788' },
    { label: 'Accent', hex: '#95D5B2' },
    { label: 'Dark', hex: '#1B2A1B' },
    { label: 'Light', hex: '#F0FFF4' },
    { label: 'Surface', hex: '#F7FDF9' },
    { label: 'Text', hex: '#1A2E1A' },
    { label: 'Muted', hex: '#6B8F6B' },
  ],
  dark: [
    { label: 'Primary', hex: '#B8860B' },
    { label: 'Secondary', hex: '#D4AF37' },
    { label: 'Accent', hex: '#FFD700' },
    { label: 'Dark', hex: '#0A0A0A' },
    { label: 'Light', hex: '#FFFDF0' },
    { label: 'Surface', hex: '#1A1A2E' },
    { label: 'Text', hex: '#F5F5F5' },
    { label: 'Muted', hex: '#6B7280' },
  ],
  purple: [
    { label: 'Primary', hex: '#7C3AED' },
    { label: 'Secondary', hex: '#A78BFA' },
    { label: 'Accent', hex: '#EC4899' },
    { label: 'Dark', hex: '#2D1B69' },
    { label: 'Light', hex: '#FAF5FF' },
    { label: 'Surface', hex: '#F5F3FF' },
    { label: 'Text', hex: '#1E1B4B' },
    { label: 'Muted', hex: '#9CA3AF' },
  ],
  cyan: [
    { label: 'Primary', hex: '#06B6D4' },
    { label: 'Secondary', hex: '#22D3EE' },
    { label: 'Accent', hex: '#67E8F9' },
    { label: 'Dark', hex: '#0C1222' },
    { label: 'Light', hex: '#F0FDFA' },
    { label: 'Surface', hex: '#ECFEFF' },
    { label: 'Text', hex: '#164E63' },
    { label: 'Muted', hex: '#6B7280' },
  ],
  rose: [
    { label: 'Primary', hex: '#E11D48' },
    { label: 'Secondary', hex: '#FB7185' },
    { label: 'Accent', hex: '#FDA4AF' },
    { label: 'Dark', hex: '#1C1017' },
    { label: 'Light', hex: '#FFF1F2' },
    { label: 'Surface', hex: '#FFF5F6' },
    { label: 'Text', hex: '#4C0519' },
    { label: 'Muted', hex: '#9CA3AF' },
  ],
  sage: [
    { label: 'Primary', hex: '#6B7F6B' },
    { label: 'Secondary', hex: '#A3B18A' },
    { label: 'Accent', hex: '#DAD7CD' },
    { label: 'Dark', hex: '#344E41' },
    { label: 'Light', hex: '#F5F7F2' },
    { label: 'Surface', hex: '#FAFBF8' },
    { label: 'Text', hex: '#2D3B2D' },
    { label: 'Muted', hex: '#8E9E8E' },
  ],
  navy: [
    { label: 'Primary', hex: '#1E3A5F' },
    { label: 'Secondary', hex: '#C9A96E' },
    { label: 'Accent', hex: '#D4AF37' },
    { label: 'Dark', hex: '#0A1628' },
    { label: 'Light', hex: '#F5F0E8' },
    { label: 'Surface', hex: '#FAF8F4' },
    { label: 'Text', hex: '#1A2332' },
    { label: 'Muted', hex: '#8B9CB5' },
  ],
  terracotta: [
    { label: 'Primary', hex: '#C2703E' },
    { label: 'Secondary', hex: '#E8C4A0' },
    { label: 'Accent', hex: '#8B5E3C' },
    { label: 'Dark', hex: '#2C1810' },
    { label: 'Light', hex: '#FDF5ED' },
    { label: 'Surface', hex: '#FAF3EC' },
    { label: 'Text', hex: '#3D2415' },
    { label: 'Muted', hex: '#A89080' },
  ],
  neon: [
    { label: 'Primary', hex: '#00FF87' },
    { label: 'Secondary', hex: '#7B61FF' },
    { label: 'Accent', hex: '#FF3D71' },
    { label: 'Dark', hex: '#0A0A0A' },
    { label: 'Light', hex: '#F0FFF4' },
    { label: 'Surface', hex: '#111111' },
    { label: 'Text', hex: '#FFFFFF' },
    { label: 'Muted', hex: '#555555' },
  ],
};

function inferPaletteFromColors(colors?: string): Array<{ label: string; hex: string }> {
  if (!colors) {
    const keys = Object.keys(PALETTE_SEEDS);
    return PALETTE_SEEDS[keys[Math.floor(Math.random() * keys.length)]];
  }

  const lower = colors.toLowerCase();

  if (lower.includes('blue') || lower.includes('bleu') || lower.includes('ocean') || lower.includes('océan')) {
    return PALETTE_SEEDS.blue;
  }

  if (lower.includes('green') || lower.includes('vert') || lower.includes('forest') || lower.includes('forêt')) {
    return PALETTE_SEEDS.green;
  }

  if (lower.includes('purple') || lower.includes('violet') || lower.includes('mauve')) {
    return PALETTE_SEEDS.purple;
  }

  if (
    lower.includes('dark') ||
    lower.includes('sombre') ||
    lower.includes('noir') ||
    lower.includes('luxe') ||
    lower.includes('gold') ||
    lower.includes('or')
  ) {
    return PALETTE_SEEDS.dark;
  }

  if (lower.includes('cyan') || lower.includes('turquoise') || lower.includes('teal') || lower.includes('arctic')) {
    return PALETTE_SEEDS.cyan;
  }

  if (lower.includes('warm') || lower.includes('chaud') || lower.includes('orange') || lower.includes('terra')) {
    return PALETTE_SEEDS.warm;
  }

  if (lower.includes('rose') || lower.includes('pink') || lower.includes('féminin') || lower.includes('feminin')) {
    return PALETTE_SEEDS.rose;
  }

  if (
    lower.includes('sage') ||
    lower.includes('nature') ||
    lower.includes('zen') ||
    lower.includes('naturel') ||
    lower.includes('bio') ||
    lower.includes('végétal')
  ) {
    return PALETTE_SEEDS.sage;
  }

  if (
    lower.includes('navy') ||
    lower.includes('marine') ||
    lower.includes('corporate') ||
    lower.includes('professionnel') ||
    lower.includes('sérieux')
  ) {
    return PALETTE_SEEDS.navy;
  }

  if (
    lower.includes('terracotta') ||
    lower.includes('terre') ||
    lower.includes('rouille') ||
    lower.includes('rust') ||
    lower.includes('artisan')
  ) {
    return PALETTE_SEEDS.terracotta;
  }

  if (
    lower.includes('neon') ||
    lower.includes('néon') ||
    lower.includes('fluo') ||
    lower.includes('gaming') ||
    lower.includes('tech') ||
    lower.includes('startup')
  ) {
    return PALETTE_SEEDS.neon;
  }

  const hexMatch = colors.match(/#[0-9A-Fa-f]{6}/g);

  if (hexMatch && hexMatch.length >= 2) {
    const labels = ['Primary', 'Secondary', 'Accent', 'Dark', 'Light', 'Surface', 'Text', 'Muted'];
    return hexMatch.slice(0, 8).map((hex, i) => ({ label: labels[i] || `Color ${i + 1}`, hex }));
  }

  return PALETTE_SEEDS.blue;
}

function buildDesignSystem(
  businessName: string,
  niche: string,
  colors?: string,
  typographyStyle?: string,
): DesignSystemResult {
  const palette = inferPaletteFromColors(colors);
  const style = typographyStyle || 'modern';

  const fontMap: Record<string, string[]> = {
    modern: ['Inter', 'DM Sans', 'system-ui', 'sans-serif'],
    elegant: ['Playfair Display', 'Inter', 'Georgia', 'serif'],
    bold: ['Montserrat', 'Poppins', 'Arial Black', 'sans-serif'],
    minimalist: ['Helvetica Neue', 'SF Pro', 'Helvetica', 'sans-serif'],
    classic: ['Lora', 'Merriweather', 'Times New Roman', 'serif'],
    playful: ['Nunito', 'Quicksand', 'sans-serif'],
    luxury: ['Cormorant Garamond', 'Didot', 'serif'],
    geometric: ['Space Grotesk', 'Outfit', 'sans-serif'],
    editorial: ['Fraunces', 'Source Serif Pro', 'serif'],
    futuristic: ['Clash Display', 'Syne', 'sans-serif'],
  };

  const featureMap: Record<string, string[]> = {
    modern: ['Rounded Corners', 'Soft Shadows', 'Gradient Accents'],
    elegant: ['Serif Typography', 'Fine Borders', 'Subtle Gradients'],
    bold: ['Strong Contrast', 'Large Headers', 'Bold Colors'],
    minimalist: ['Clean Lines', 'Whitespace', 'Micro-interactions'],
    classic: ['Traditional Layout', 'Structured Grid', 'Timeless Feel'],
    playful: ['Rounded Shapes', 'Bright Colors', 'Animated Elements'],
    luxury: ['Gold Accents', 'Thin Lines', 'Rich Photography'],
    geometric: ['Angular Shapes', 'Grid Precision', 'Structured Layout'],
    editorial: ['Magazine Layout', 'Large Typography', 'Content-first'],
    futuristic: ['Neon Accents', 'Dark Background', 'Glass Effects'],
  };

  return {
    name: `${businessName || niche} Premium`,
    palette,
    typography: { style, fonts: fontMap[style] || fontMap.modern },
    features: featureMap[style] || featureMap.modern,
  };
}

function buildCreativeBrief(
  niche: string,
  businessName?: string,
  colors?: string,
  typographyStyle?: string,
  styleDescription?: string,
  designReferences?: DesignReference[],
): string {
  const name = businessName || `a premium ${niche} business`;
  const style = typographyStyle || 'modern';

  const typoMap: Record<string, string> = {
    modern:
      'Typographie sans-serif contemporaine et clean (Inter, DM Sans) avec whitespace généreux et hiérarchie claire. Approche Vercel/Linear.',
    elegant:
      'Association serif + sans-serif raffinée (Playfair Display + Inter). Feel sophistiqué, intemporel et luxueux. Approche hôtellerie de luxe.',
    bold: 'Typographie display impactante et forte (Montserrat, Poppins Bold). Présence confiante avec titres très grands. Approche startup ambitieuse.',
    minimalist:
      'Hiérarchie typo ultra-clean (Helvetica Neue, SF Pro). Retenue, purposeful, maximum de whitespace. Approche Apple.',
    classic:
      'Typographie traditionnelle et digne de confiance (Lora, Merriweather). Heritage feel avec grille structurée et élégante.',
    playful:
      'Typographie ronde et amicale (Nunito, Quicksand). Ambiance décontractée, accessible et chaleureuse. Couleurs vives.',
    luxury:
      'Typographie haute couture (Cormorant Garamond, Didot). Accents dorés, lignes fines, photographie riche. Premium absolu.',
    geometric:
      'Typographie géométrique précise (Space Grotesk, Outfit). Formes angulaires, grille rigoureuse. Approche architecturale.',
    editorial:
      'Layout magazine avec grande typographie (Fraunces, Source Serif Pro). Content-first, storytelling visuel, asymétrie maîtrisée.',
    futuristic:
      'Typographie futuriste et tech (Clash Display, Syne). Accents néon, fond sombre, effets glass. Approche startup tech/SaaS.',
  };

  const nicheHints: Record<string, string> = {
    plumber:
      'Show trust badges, emergency availability (24/7), service areas, before/after gallery, customer testimonials with star ratings, and a prominent "Call Now" CTA. Include certifications (RGE, Qualibat) and insurance badges.',
    plombier:
      'Badges de confiance (RGE, Qualibat, décennale), disponibilité urgence 24h/7j avec numéro cliquable (format 06 XX XX XX XX), zone d\'intervention sur carte, galerie avant/après en slider, avis clients avec étoiles dorées et photos, devis gratuit en ligne, tarifs transparents, mentions "Artisan certifié". CTA rouge pulsant "Appeler maintenant".',
    restaurant:
      'Photo culinaire hero en plein écran avec parallax, menu du jour en typographie manuscrite, carte avec catégories filtrables et photos HD, réservation inline avec sélecteur de date/heure, galerie ambiance en masonry, portrait du chef + histoire, avis TripAdvisor/Google intégrés, horaires par jour, Google Maps embed, liens réseaux sociaux.',
    dentist:
      'Highlight services with icons, team photos with credentials, patient testimonials, insurance accepted, online booking CTA (Doctolib-style), before/after gallery, virtual tour, FAQ by treatment type.',
    dentiste:
      'Design rassurant (blanc + bleu ciel), services par catégorie (esthétique, implants, orthodontie, pédodontie) avec icônes, équipe avec diplômes et spécialités, prise de RDV Doctolib intégrée, galerie avant/après soins esthétiques, tarifs avec base Sécu, FAQ par soin, visite virtuelle du cabinet, mentions "Conventionné secteur 1/2".',
    photographer:
      'Full-width portfolio gallery in masonry grid, category filters (wedding, portrait, corporate), packages/pricing comparison, about with personal portrait, client testimonials, contact form contextual by shooting type.',
    photographe:
      'Portfolio masonry plein écran sans marges, catégories (mariage, portrait, corporate, événement) avec filtres, lightbox avec gestes, packages avec comparateur de formules, section "Mon approche" narrative avec portrait, témoignages clients avec galerie associée, formulaire contextuel par type de shooting, blog.',
    lawyer:
      'Professional authority: practice areas with icons, attorney profiles with bar admissions, case results/stats, client testimonials, free consultation CTA, legal publications.',
    avocat:
      "Design sobre et autoritaire (navy + or/bordeaux), domaines de compétence détaillés avec icônes (droit des affaires, pénal, famille, immobilier), profils avocats avec barreau et spécialités, résultats chiffrés, honoraires et convention d'honoraires expliqués, consultation gratuite CTA, articles juridiques vulgarisés, mentions déontologiques.",
    'real estate':
      'Featured listings with card grid and carousel photos, advanced property search (price, area, DPE), agent profiles, neighborhood guides with stats, mortgage calculator, contact form.',
    immobilier:
      "Recherche de biens avec filtres avancés (prix, surface, quartier, DPE énergie), cartes d'annonces avec carrousel photos, estimation en ligne, alerte email, visite virtuelle 360°, simulateur de prêt, guides acheteur/vendeur/locataire, équipe avec zones géographiques, diagnostics obligatoires mentionnés.",
    couvreur:
      "Photos drone de toitures rénovées en hero, services détaillés (couverture, zinguerie, charpente, isolation, étanchéité), badges RGE + Qualibat + décennale, avant/après slider, devis en ligne avec upload photo, zone d'intervention carte, aides financières expliquées (MaPrimeRénov', CEE, éco-PTZ), témoignages avec photos de chantier.",
    roofer:
      'Aerial drone photography hero, services grid with animations, free inspection CTA, financing options, certifications wall, project gallery with filters, 5-star review carousel, emergency service banner.',
    artisan:
      "Galerie portfolio en masonry, story de l'artisan en timeline, savoir-faire détaillé, certifications et labels qualité, devis gratuit CTA, témoignages avec photos de chantier, blog conseils entretien, zone d'intervention.",
    boulangerie:
      'Photos macro de pains et viennoiseries en hero, story du boulanger et de ses farines, carte des produits illustrée par catégorie, horaires par jour, commande spéciale (gâteaux, traiteur), galerie Instagram, plan d\'accès, mentions "Pain au levain naturel", "Farines bio".',
    coiffeur:
      'Vidéo loop de coiffures en hero, galerie avant/après, services détaillés (coupe, coloration, balayage, lissage, barbe) avec tarifs, équipe avec spécialités, prise de RDV en ligne, produits vendus au salon, blog tendances capillaires, programme fidélité.',
    garage:
      'Design industriel (fond sombre + accents orange/rouge), services en grille (vidange, freins, pneus, contrôle technique, climatisation), tarifs forfaitaires transparents, marques véhicules acceptées, devis en ligne, véhicule de prêt mentionné, avis Google, horaires et accès.',
    coach:
      'Design épuré et inspirant, couleurs apaisantes, hero avec portrait + citation inspirante, parcours et certifications (ICF, PNL), programmes (individuel, groupe, entreprise) avec pricing, témoignages transformations, blog articles développement personnel, réservation séance découverte gratuite.',
    architecte:
      'Design minimaliste suisse, projets en grid avec hover reveal (photos, plans, surface, budget), services (construction, rénovation, extension, décoration), processus en 5 étapes visuelles, publications presse, formulaire projet détaillé.',
    fitness:
      "Design énergique fond noir + accents néon, vidéo hero d'entraînement, programmes (musculation, cardio, HIIT, yoga) avec détails, coachs certifiés, planning cours interactif, tarifs abonnement comparateur, transformations avant/après, essai gratuit CTA.",
    veterinaire:
      "Design doux (verts + beiges), photos d'animaux, services (consultation, chirurgie, dentisterie, NAC, urgences), équipe avec spécialités, urgences 24h, prise de RDV, conseils santé animale, pharmacie vétérinaire.",
    ecommerce:
      'Hero produit vedette animé, catégories en bento grid visuelles, carrousel nouveautés, badges livraison gratuite/retours/paiement sécurisé, section tendances, newsletter avec réduction, CGV et politique retour dans footer.',
    spa: 'Design zen et luxueux, tons naturels (beige, vert sauge, doré), photos ambiance détente, soins détaillés avec durée et prix, forfaits bien-être, bons cadeaux en ligne, réservation, galerie des espaces, équipe de praticiens.',
    fleuriste:
      'Design romantique et coloré, hero avec bouquet saisonnier, catalogue par occasion (mariage, deuil, anniversaire, Saint-Valentin), livraison même jour, abonnement floral, galerie de créations, commande en ligne, témoignages.',
    traiteur:
      'Photos culinaires premium en hero, menus par événement (mariage, entreprise, anniversaire) avec tarifs par personne, galerie de prestations, témoignages clients, devis personnalisé, produits de saison mis en avant.',
    electricien:
      'Badges Consuel + Qualifelec + décennale, services (installation, rénovation, dépannage, domotique, borne de recharge), urgence 24h, devis gratuit, avant/après, normes NF C 15-100 mentionnées, aides financières.',
    paysagiste:
      "Galerie de réalisations plein écran (jardins, terrasses, piscines), services détaillés avec visuels, processus de création en étapes, devis sur mesure, entretien annuel, inspirations saisonnières, zone d'intervention.",
  };

  const nicheLower = niche.toLowerCase();
  const nicheSpecific = Object.entries(nicheHints).find(([key]) => nicheLower.includes(key))?.[1] || '';

  const parts: string[] = [
    "Tu es un designer UI/UX d'élite — parmi les meilleurs au monde. Tu as conçu des sites primés pour Apple, Stripe, Linear, Vercel et des agences françaises comme Locomotive, Bureau Vallée Digital.",
    'Tu as un œil obsessionnel pour le détail, le pixel-perfect, et tu sais instinctivement créer des designs qui convertissent les visiteurs en clients.',
    'Tu vis et respires les tendances design 2026. Tu es toujours en avance.',
    '',
    `Ton client : ${name}, une entreprise de ${niche} basée en France.`,
    'TOUT le contenu du site est en FRANÇAIS — chaque titre, paragraphe, bouton, label, lien de navigation, témoignage et texte de footer. Tu penses et écris naturellement en français pour ce projet.',
    'Utilise des vrais prénoms et noms français pour les témoignages (Marie Dupont, Pierre Martin, Sophie Lefèvre...), des villes françaises, des numéros de téléphone au format 06 XX XX XX XX.',
    '',
    'En tant que designer au sommet de ton art en 2026, tu intègres naturellement :',
    '- Bento grid layouts et compositions asymétriques — inspirées de Dribbble et Pinterest 2026',
    '- Glassmorphism subtil et gradient meshes pour ajouter de la profondeur',
    "- Micro-interactions et hover states qui donnent vie à l'interface",
    "- Hero sections bold avec forte hiérarchie visuelle qui captent l'attention instantanément",
    "- Whitespace généreux — tu sais que l'espace de respiration sépare le bon design du grand design",
    '- Sections alternées clair/sombre pour un rythme visuel naturel',
    '- Images haute qualité de Unsplash (utilise de VRAIS URLs : https://images.unsplash.com/photo-...)',
    "- Icônes cohérentes d'un même set (Lucide, Phosphor ou Heroicons)",
    '- Animations de reveal au scroll et transitions fluides entre sections',
    '- Badges et social proof dès le premier écran (avis Google, certifications, compteurs)',
    '',
    'STRUCTURE OBLIGATOIRE DU SITE (dans cet ordre) :',
    '1. HEADER STICKY : Logo + navigation + CTA principal (bouton coloré "Devis gratuit" ou "Réserver"). Le header devient compact et avec backdrop-blur au scroll.',
    '2. HERO SECTION : Occupe 100vh minimum. Titre percutant (H1), sous-titre bénéfice, CTA primaire + secondaire, image/vidéo de haute qualité. Badges de confiance inline (⭐ 4.9/5 sur Google, 500+ clients satisfaits).',
    '3. BANDEAU DE CONFIANCE : Logos partenaires/certifications en défilement ou grille (RGE, Qualibat, décennale, labels qualité...).',
    '4. SERVICES : Grid ou bento layout avec icônes, titres, descriptions détaillées. Minimum 6 services. Chaque service avec hover effect.',
    "5. À PROPOS / NOTRE HISTOIRE : Section narrative avec photo de l'équipe/fondateur, chiffres clés animés (années d'expérience, projets réalisés, clients satisfaits), valeurs.",
    '6. RÉALISATIONS / PORTFOLIO : Galerie masonry ou grid avec filtres par catégorie, minimum 6 projets avec images HD et descriptions.',
    '7. TÉMOIGNAGES : Carrousel ou grid de minimum 4 avis clients avec prénom, ville, note étoiles, photo avatar, texte détaillé de 2-3 phrases. Avis réalistes et crédibles en français.',
    '8. PROCESSUS : Timeline ou étapes numérotées (Comment ça marche en 4 étapes), avec icônes et descriptions.',
    '9. FAQ : Accordéon avec minimum 5 questions-réponses pertinentes pour le secteur.',
    "10. CTA FINAL : Section avec fond contrasté, titre accrocheur, formulaire de contact ou bouton d'action principal.",
    '11. FOOTER COMPLET : Logo, description courte, liens navigation, coordonnées (adresse, téléphone, email), réseaux sociaux, horaires, mentions légales, politique de confidentialité RGPD, copyright 2026.',
    '',
    'Tu ne fais jamais les choses à moitié. Tu remplis CHAQUE section avec du vrai contenu français réfléchi — JAMAIS de lorem ipsum, JAMAIS de placeholder.',
    'Services multiples avec descriptions détaillées. Témoignages de vrais clients français avec des avis complets. Galerie portfolio riche.',
    "La page défile harmonieusement sur 6+ hauteurs d'écran de contenu soigné.",
    '',
    'SPÉCIFICITÉS FRANÇAISES obligatoires :',
    '- Mentions légales et conformité RGPD dans le footer',
    '- Numéros de téléphone au format français (06 XX XX XX XX)',
    '- Adresses françaises réalistes',
    '- Références aux certifications françaises pertinentes (RGE, Qualibat, Qualiopi, etc.)',
    '- Bouton cookie consent / bandeau RGPD',
    '- Horaires au format français (Lun-Ven : 8h-18h)',
  ];

  if (nicheSpecific) {
    parts.push('', `For the ${niche} industry, you know what works:`, nicheSpecific);
  }

  parts.push(
    '',
    'Your design signature:',
    `- ${typoMap[style] || typoMap.modern}`,
    '- A color palette that feels intentional and cohesive, with proper contrast',
    '- Consistent spacing on an 8px grid — because you respect the details',
    '- Icons from a unified set that feel part of the same family',
    '- Buttons with hover states, thoughtful padding, and clear visual hierarchy',
    '- Smooth transitions between sections that guide the eye',
  );

  if (colors) {
    parts.push(
      '',
      `The client has a brand direction in mind: ${colors}. You take this as inspiration and build a refined palette around it.`,
    );
  }

  if (styleDescription) {
    parts.push('', `Additional direction from the client: ${styleDescription}`);
  }

  if (designReferences && designReferences.length > 0) {
    parts.push(
      '',
      'RÉFÉRENCES DE DESIGN (Dribbble, Pinterest, Awwwards, Behance) — Tu as étudié les meilleurs designs du marché dans cette industrie. Inspire-toi de ce qui les rend exceptionnels :',
    );

    for (const ref of designReferences) {
      parts.push(`- [${ref.source}] "${ref.title}" : ${ref.description}`);
    }

    parts.push(
      '',
      'Prends les meilleurs éléments de chaque référence et sublime-les. Ton design doit être SUPÉRIEUR à toutes ces références combinées.',
      'Concentre-toi sur : les layouts innovants, les hiérarchies visuelles qui convertissent, les micro-détails qui font la différence (ombres, border-radius, espacements).',
    );
  }

  parts.push(
    '',
    `Conçois ce site comme toi seul sais le faire — complet, soigné et magnifique. Montre au client pourquoi tu es le meilleur designer au monde.`,
    'Le résultat final doit ressembler à un vrai site de production, pas à un template générique. Chaque pixel compte.',
  );

  return parts.join('\n');
}

interface DesignReference {
  title: string;
  description: string;
  source: string;
}

/*
 * Design gods — universally stunning websites to use as LAYOUT/DESIGN SYSTEM reference
 * These are the "gold standard" regardless of niche
 */
const DESIGN_GODS: Array<{ url: string; style: string; bestFor: string }> = [
  {
    url: 'https://linear.app',
    style: 'modern-saas',
    bestFor: 'Hero avec gradient mesh, layout ultra-clean, animations smooth, dark mode élégant',
  },
  {
    url: 'https://stripe.com',
    style: 'modern-corporate',
    bestFor:
      'Hiérarchie typographique parfaite, grids innovants, couleurs vibrantes sur fond clair, micro-interactions subtiles',
  },
  {
    url: 'https://vercel.com',
    style: 'minimalist-tech',
    bestFor: 'Whitespace maximal, typographie bold, sections alternées noir/blanc, CTAs nets',
  },
  {
    url: 'https://www.apple.com/fr',
    style: 'minimalist-luxury',
    bestFor: 'Photos produit immersives, scroll storytelling, typography large et aérée, simplicité absolue',
  },
  {
    url: 'https://raycast.com',
    style: 'modern-product',
    bestFor: 'Bento grid, glassmorphism, gradients subtils, feature showcase élégant',
  },
  {
    url: 'https://framer.com',
    style: 'creative-modern',
    bestFor: 'Layout asymétrique, animations reveal, typographie display bold, design playground',
  },
  {
    url: 'https://monopo.co.jp',
    style: 'editorial-agency',
    bestFor: 'Layout éditorial magazine, typo géante, portfolio immersif, asymétrie maîtrisée',
  },
  {
    url: 'https://www.awwwards.com/sites/obys-agency',
    style: 'avant-garde',
    bestFor: 'Layout expérimental, animations complexes, identité visuelle forte',
  },
  {
    url: 'https://www.sezane.com',
    style: 'elegant-ecommerce',
    bestFor: 'E-commerce éditorial, photographie lifestyle, storytelling brand, palette douce',
  },
  {
    url: 'https://www.aesop.com/fr',
    style: 'luxury-minimal',
    bestFor: 'Minimalisme luxueux, palette restreinte, typographie serif raffinée, contenu immersif',
  },
];

interface ScreenshotResult {
  screenshotUrl: string;
  sourceUrl: string;
  why: string;
}

function pickDesignGod(niche: string, typographyStyle?: string): (typeof DESIGN_GODS)[number] {
  const style = typographyStyle || 'modern';
  const styleMap: Record<string, string[]> = {
    modern: ['modern-saas', 'modern-product', 'modern-corporate'],
    elegant: ['luxury-minimal', 'elegant-ecommerce', 'editorial-agency'],
    bold: ['creative-modern', 'modern-corporate', 'modern-saas'],
    minimalist: ['minimalist-tech', 'minimalist-luxury', 'luxury-minimal'],
    classic: ['elegant-ecommerce', 'luxury-minimal', 'modern-corporate'],
    playful: ['creative-modern', 'modern-product', 'modern-saas'],
    luxury: ['luxury-minimal', 'minimalist-luxury', 'elegant-ecommerce'],
    geometric: ['modern-saas', 'minimalist-tech', 'modern-product'],
    editorial: ['editorial-agency', 'avant-garde', 'elegant-ecommerce'],
    futuristic: ['avant-garde', 'modern-saas', 'creative-modern'],
  };
  const preferred = styleMap[style] || styleMap.modern;

  for (const pref of preferred) {
    const match = DESIGN_GODS.find((g) => g.style === pref);

    if (match) {
      return match;
    }
  }

  return DESIGN_GODS[0];
}

async function findAwardWinningSites(niche: string, tavilyKey: string): Promise<Array<{ url: string; why: string }>> {
  const queries = [
    `site:godly.website ${niche}`,
    `site:awwwards.com/websites ${niche} site of the day`,
    `best ${niche} website design award winning beautiful 2025 2026`,
  ];

  const allUrls: Array<{ url: string; why: string }> = [];

  const results = await Promise.all(
    queries.map(async (query) => {
      try {
        const resp = await fetch('https://api.tavily.com/search', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            api_key: tavilyKey,
            query,
            max_results: 3,
            include_answer: false,
            include_raw_content: false,
          }),
          signal: AbortSignal.timeout(5000),
        });

        if (!resp.ok) {
          return [];
        }

        const data = (await resp.json()) as {
          results: Array<{ title: string; url: string; content: string }>;
        };

        return data.results
          .filter((r) => {
            const u = r.url.toLowerCase();
            return (
              !u.includes('dribbble.com') &&
              !u.includes('pinterest.com') &&
              !u.includes('behance.net') &&
              r.title &&
              r.content
            );
          })
          .map((r) => ({
            url: r.url,
            why: `${r.title} — ${r.content.slice(0, 200)}`,
          }));
      } catch {
        return [];
      }
    }),
  );

  for (const batch of results) {
    allUrls.push(...batch);
  }

  logger.info(`Found ${allUrls.length} award-winning site(s) for "${niche}"`);

  return allUrls.slice(0, 4);
}

async function collectScreenshots(
  niche: string,
  typographyStyle?: string,
  userUrls?: string[],
  tavilyKey?: string,
): Promise<ScreenshotResult[]> {
  const results: ScreenshotResult[] = [];

  // 1. User-provided URLs have top priority
  if (userUrls && userUrls.length > 0) {
    for (const url of userUrls.slice(0, 3)) {
      const screenshotUrl = `https://image.thum.io/get/fullpage/width/1440/noanimate/${url}`;
      results.push({ screenshotUrl, sourceUrl: url, why: "Référence choisie par l'utilisateur" });
      logger.info(`User reference: ${url}`);
    }
  }

  // 2. Pick one "design god" matching the style for layout/design system inspiration
  if (results.length < 2) {
    const god = pickDesignGod(niche, typographyStyle);
    const screenshotUrl = `https://image.thum.io/get/fullpage/width/1440/noanimate/${god.url}`;
    results.push({ screenshotUrl, sourceUrl: god.url, why: `Design de référence mondiale — ${god.bestFor}` });
    logger.info(`Design god picked: ${god.url} (${god.style})`);
  }

  // 3. Search award sites for niche-specific beautiful sites
  if (tavilyKey && results.length < 3) {
    try {
      const awardSites = await findAwardWinningSites(niche, tavilyKey);

      for (const site of awardSites.slice(0, 2)) {
        if (results.some((r) => r.sourceUrl === site.url)) {
          continue;
        }

        const screenshotUrl = `https://image.thum.io/get/fullpage/width/1440/noanimate/${site.url}`;
        results.push({ screenshotUrl, sourceUrl: site.url, why: site.why });
      }
    } catch (err) {
      logger.warn(`Award site search failed: ${err instanceof Error ? err.message : err}`);
    }
  }

  // Validate screenshots are accessible (HEAD check in parallel)
  const validated: ScreenshotResult[] = [];

  await Promise.all(
    results.slice(0, 3).map(async (r) => {
      try {
        const resp = await fetch(r.screenshotUrl, {
          method: 'HEAD',
          signal: AbortSignal.timeout(4000),
        });

        if (resp.ok || resp.status === 301 || resp.status === 302) {
          validated.push(r);
        } else {
          logger.warn(`Screenshot unavailable for ${r.sourceUrl} (status ${resp.status})`);
        }
      } catch {
        logger.warn(`Screenshot HEAD failed for ${r.sourceUrl}`);
      }
    }),
  );

  logger.info(`${validated.length} screenshot(s) validated for "${niche}"`);

  return validated;
}

async function fetchScreenshotAsBase64(screenshotUrl: string): Promise<string | null> {
  try {
    const resp = await fetch(screenshotUrl, {
      signal: AbortSignal.timeout(15000),
    });

    if (!resp.ok) {
      return null;
    }

    const buffer = await resp.arrayBuffer();
    const base64 = Buffer.from(buffer).toString('base64');
    const contentType = resp.headers.get('content-type') || 'image/png';

    return `data:${contentType};base64,${base64}`;
  } catch (err) {
    logger.warn(`Failed to fetch screenshot as base64: ${err instanceof Error ? err.message : err}`);
    return null;
  }
}

const CURATED_REFERENCES: Record<string, DesignReference[]> = {
  plumber: [
    {
      title: "Plumbing Pro – Hero avec compteur d'interventions",
      description:
        'Header sticky transparent, hero plein écran avec photo technicien, compteurs animés (2500+ interventions, 98% satisfaction), CTA "Urgence 24/7" en rouge pulsant. Sections: services en bento grid 3x2 avec icônes outline, galerie avant/après en slider, avis Google intégrés avec étoiles dorées, zone d\'intervention sur carte interactive, formulaire devis en 3 étapes.',
      source: 'Dribbble',
    },
    {
      title: 'AquaFix – Design épuré bleu marine',
      description:
        'Navigation minimaliste, hero asymétrique avec vidéo en background, badges de confiance (RGE, Qualibat) en bandeau. Pricing transparent avec 3 forfaits, FAQ accordéon, footer riche avec horaires et numéro cliquable.',
      source: 'Awwwards',
    },
    {
      title: 'FlowMaster Plumbing – Landing page conversion',
      description:
        'Above the fold optimisé : titre accrocheur, sous-titre bénéfice, numéro de téléphone géant, formulaire inline. Social proof immédiat avec logos partenaires. Témoignages vidéo, garantie satisfaction mise en avant.',
      source: 'Behance',
    },
  ],
  plombier: [
    {
      title: 'PlombExpress – Site vitrine artisan français',
      description:
        'Design français authentique avec header bleu/blanc, hero montrant un artisan souriant, badges "Artisan certifié RGE", "Devis gratuit en 2h", "Intervention 7j/7". Tarifs transparents, zone d\'intervention par code postal, avis clients avec photos, mentions légales RGPD complètes.',
      source: 'Dribbble',
    },
    {
      title: 'Maison Plomberie – Élégance artisanale',
      description:
        'Approche premium pour plombier haut de gamme. Fond crème, typographie serif élégante, photos de salles de bain rénovées. Services détaillés : installation, rénovation, dépannage. Portfolio de réalisations avec filtres, blog conseils, chat en direct.',
      source: 'Pinterest',
    },
  ],
  restaurant: [
    {
      title: 'Gusto – Restaurant landing page immersive',
      description:
        'Plein écran photo culinaire avec parallax, navigation overlay transparente, menu du jour en typographie manuscrite animée. Sections : carte avec catégories filtrables et photos, réservation inline avec calendrier, galerie ambiance masonry, portrait du chef avec histoire, avis TripAdvisor intégrés. Footer avec plan Google Maps embed.',
      source: 'Awwwards',
    },
    {
      title: "La Table d'Or – Gastronomie française",
      description:
        'Design dark élégant avec accents dorés, hero vidéo du restaurant, typographie Playfair Display + Inter. Menu dégustation présenté comme un parcours visuel, section "Notre philosophie" avec timeline, réservation OpenTable intégrée, galerie Instagram feed en temps réel.',
      source: 'Dribbble',
    },
    {
      title: 'Bistro Modern – Fast casual branding',
      description:
        'Style jeune et dynamique, couleurs vives, illustrations custom, menu interactif avec badges (végétarien, sans gluten), commande en ligne, programme fidélité, stories du personnel.',
      source: 'Behance',
    },
  ],
  dentist: [
    {
      title: 'SmileCare – Clinique dentaire premium',
      description:
        'Fond blanc immaculé, accents bleu ciel rassurant, hero avec sourire naturel. Navigation par type de soin (esthétique, implants, orthodontie). Profils dentistes avec diplômes, visite virtuelle du cabinet, prise de RDV Doctolib intégrée, FAQ par soin, témoignages patients avant/après.',
      source: 'Dribbble',
    },
    {
      title: 'DentaLux – Expérience patient digitale',
      description:
        'Design app-like avec micro-animations, parcours patient interactif, simulateur de résultat blanchiment, formulaire premier RDV intelligent, espace patient sécurisé, blog santé bucco-dentaire.',
      source: 'Awwwards',
    },
  ],
  dentiste: [
    {
      title: 'Cabinet Sourire – Dentiste français moderne',
      description:
        'Design rassurant et professionnel adapté au marché français. Hero avec photo d\'équipe, badges "Conventionné", "Tiers payant", "Urgences". Soins détaillés avec tarifs Sécu/complémentaire, équipe avec spécialités, prise de RDV Doctolib, accès PMR mentionné, mentions RGPD.',
      source: 'Pinterest',
    },
  ],
  photographer: [
    {
      title: 'LensArt – Portfolio photographe minimaliste',
      description:
        'Grid masonry plein écran sans padding, navigation discrète qui disparaît au scroll, lightbox avec gestes swipe. Catégories : mariage, portrait, corporate, événement. À propos avec portrait et philosophy, packages avec comparaison, formulaire de contact contextuel par type de shooting.',
      source: 'Awwwards',
    },
    {
      title: "Capteur d'Âmes – Photographe auteur",
      description:
        'Design éditorial magazine-like, grandes photos en pleine page avec textes overlay, scroll horizontal pour les séries, dark mode par défaut, animations reveal au scroll, musique de fond optionnelle.',
      source: 'Behance',
    },
  ],
  photographe: [
    {
      title: 'Studio Lumière – Photographe mariage France',
      description:
        'Style romantique et aérien, tons pastels, typographie manuscrite + sans-serif. Hero carrousel de mariages, section "Mon approche" narrative, galeries triées par lieu (Paris, Provence, Côte d\'Azur), tarifs "à partir de", blog mariages, formulaire avec date et lieu.',
      source: 'Pinterest',
    },
  ],
  lawyer: [
    {
      title: "LexPro – Cabinet d'avocats corporate",
      description:
        "Design autoritaire et sobre, fond navy + or, typographie serif imposante. Hero avec skyline, domaines d'expertise en grid iconique, profils avocats avec barreaux et spécialités, résultats chiffrés (500+ affaires gagnées), publications juridiques, formulaire consultation gratuite.",
      source: 'Dribbble',
    },
  ],
  avocat: [
    {
      title: 'Maître & Associés – Cabinet français',
      description:
        "Design conforme aux règles déontologiques du barreau français. Tons bordeaux et crème, domaines de compétence détaillés (droit des affaires, pénal, famille), honoraires et convention d'honoraires, accès au droit (aide juridictionnelle), prise de RDV, articles juridiques vulgarisés.",
      source: 'Pinterest',
    },
  ],
  immobilier: [
    {
      title: 'NestHome – Agence immobilière premium',
      description:
        "Recherche de biens avec filtres avancés (prix, surface, quartier, DPE), cartes d'annonces avec carrousel photos, estimation en ligne, alertes email, visite virtuelle 360°, simulateur de prêt, guides acheteur/vendeur, équipe avec zones géographiques.",
      source: 'Dribbble',
    },
    {
      title: 'Pierre & Prestige – Immobilier de luxe',
      description:
        "Design magazine avec photos architecturales plein écran, biens d'exception en présentation story, vidéo drone, quartiers détaillés avec stats, service conciergerie, off-market sur demande.",
      source: 'Awwwards',
    },
  ],
  couvreur: [
    {
      title: 'ToitPro – Couvreur artisan certifié',
      description:
        "Hero avec drone shot de toiture rénovée, badge RGE + Qualibat + décennale. Services : couverture, zinguerie, charpente, isolation, étanchéité. Avant/après slider, devis en ligne avec upload photo, zone d'intervention carte, aides financières (MaPrimeRénov', CEE) expliquées.",
      source: 'Pinterest',
    },
  ],
  roofer: [
    {
      title: 'RoofCraft – Modern roofing company',
      description:
        'Bold design with aerial photography, services grid with animations, free inspection CTA prominent, financing options, certifications wall, project gallery with filters, 5-star review carousel, emergency service banner.',
      source: 'Dribbble',
    },
  ],
  artisan: [
    {
      title: "L'Atelier – Artisan multi-services",
      description:
        'Design chaleureux avec textures bois/pierre, portfolio de réalisations en masonry, savoir-faire en timeline chronologique, certifications et labels, devis gratuit, témoignages avec photos de chantier, blog conseils.',
      source: 'Pinterest',
    },
  ],
  ecommerce: [
    {
      title: 'ShopLux – E-commerce premium',
      description:
        'Hero avec produit vedette animé, catégories en bento grid visuelles, carrousel nouveautés, badges livraison gratuite/retours/paiement sécurisé, section tendances, newsletter avec réduction, footer méga-menu avec FAQ, CGV, politique de retour.',
      source: 'Awwwards',
    },
  ],
  boulangerie: [
    {
      title: 'La Mie Dorée – Boulangerie artisanale',
      description:
        "Design chaleureux tons bruns et crème, photos macro de pains et viennoiseries, story du boulanger, nos farines et ingrédients, carte des produits illustrée, horaires par jour, commande spéciale (gâteaux, traiteur), galerie Instagram, plan d'accès.",
      source: 'Pinterest',
    },
  ],
  coiffeur: [
    {
      title: 'Studio Ciseaux – Salon de coiffure tendance',
      description:
        'Design glamour avec vidéo loop de coiffures, galerie avant/après, services détaillés (coupe, coloration, balayage, lissage), tarifs par prestation, équipe avec spécialités, prise de RDV en ligne, produits vendus au salon, blog tendances capillaires.',
      source: 'Dribbble',
    },
  ],
  garage: [
    {
      title: 'AutoPro Garage – Mécanique automobile',
      description:
        'Design industriel moderne, fond sombre avec accents orange, services en grille (vidange, freins, pneus, contrôle technique), tarifs forfaitaires transparents, marques acceptées, devis en ligne, véhicule de prêt, avis Google, accès et horaires.',
      source: 'Pinterest',
    },
  ],
  coach: [
    {
      title: 'MindShift – Coach de vie / développement personnel',
      description:
        'Design épuré et inspirant, couleurs apaisantes (sage green, lavande), hero avec portrait professionnel et citation, parcours et certifications (ICF), programmes (individuel, groupe, entreprise), témoignages transformations, blog articles, réservation séance découverte gratuite.',
      source: 'Dribbble',
    },
  ],
  architecte: [
    {
      title: "Studio Archi – Cabinet d'architecture",
      description:
        'Design minimaliste ultra-clean, fond blanc pur, typographie suisse, projets en grid avec hover reveal des détails. Chaque projet : photos, plans, description, surface, budget. Services (construction, rénovation, extension, décoration intérieure), processus en 5 étapes, publications presse, formulaire projet.',
      source: 'Awwwards',
    },
  ],
  fitness: [
    {
      title: 'IronPulse – Salle de sport / coaching',
      description:
        "Design énergique et bold, fond noir avec accents néon, vidéo hero d'entraînement, programmes (musculation, cardio, HIIT, yoga), coachs avec certifications, planning des cours interactif, tarifs abonnement avec comparateur, transformation clients avant/après, essai gratuit CTA.",
      source: 'Behance',
    },
  ],
  veterinaire: [
    {
      title: 'VétoCare – Clinique vétérinaire',
      description:
        "Design doux et rassurant, tons verts et beiges, photos d'animaux mignons, services (consultation, chirurgie, dentisterie, NAC), équipe véto avec spécialités, urgences 24h, prise de RDV en ligne, conseils santé animale, pharmacie, assurance animaux.",
      source: 'Pinterest',
    },
  ],
};

async function fetchDesignReferences(niche: string, tavilyKey?: string): Promise<DesignReference[]> {
  const nicheLower = niche.toLowerCase();
  const curatedRefs: DesignReference[] = [];

  for (const [key, refs] of Object.entries(CURATED_REFERENCES)) {
    if (nicheLower.includes(key) || key.includes(nicheLower)) {
      curatedRefs.push(...refs);
    }
  }

  if (curatedRefs.length > 0) {
    logger.info(`Found ${curatedRefs.length} curated reference(s) for "${niche}"`);
  }

  if (!tavilyKey) {
    logger.debug('No Tavily key, using curated references only');
    return curatedRefs.slice(0, 6);
  }

  const queries = [
    `site:dribbble.com ${niche} website design landing page 2025 2026`,
    `site:awwwards.com ${niche} website best design`,
    `site:behance.net ${niche} website UI UX complete`,
    `site:pinterest.com ${niche} website design inspiration landing page`,
    `site:land-book.com ${niche} website`,
  ];

  const liveRefs: DesignReference[] = [];

  const fetchPromises = queries.map(async (query) => {
    try {
      const resp = await fetch('https://api.tavily.com/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          api_key: tavilyKey,
          query,
          max_results: 3,
          include_answer: false,
          include_raw_content: false,
        }),
        signal: AbortSignal.timeout(5000),
      });

      if (!resp.ok) {
        return [];
      }

      const data = (await resp.json()) as {
        results: Array<{ title: string; url: string; content: string }>;
      };

      return data.results
        .filter((r) => r.content && r.title)
        .map((r) => {
          const source = r.url.includes('dribbble')
            ? 'Dribbble'
            : r.url.includes('awwwards')
              ? 'Awwwards'
              : r.url.includes('behance')
                ? 'Behance'
                : r.url.includes('pinterest')
                  ? 'Pinterest'
                  : r.url.includes('land-book')
                    ? 'Land-book'
                    : 'Web';
          return {
            title: r.title.slice(0, 120),
            description: r.content.slice(0, 400),
            source,
          } as DesignReference;
        });
    } catch {
      return [];
    }
  });

  const results = await Promise.all(fetchPromises);

  for (const batch of results) {
    liveRefs.push(...batch);
  }

  logger.info(`Found ${liveRefs.length} live reference(s) for "${niche}"`);

  const combined = [...curatedRefs, ...liveRefs];
  const seen = new Set<string>();

  return combined
    .filter((ref) => {
      const key = ref.title.toLowerCase();

      if (seen.has(key)) {
        return false;
      }

      seen.add(key);

      return true;
    })
    .slice(0, 8);
}

let mcpSessionId: string | null = null;

export async function callStitchMCP(apiKey: string, toolName: string, args: Record<string, unknown>): Promise<any> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Accept: 'application/json, text/event-stream',
    'X-Goog-Api-Key': apiKey,
  };

  if (mcpSessionId) {
    headers['Mcp-Session-Id'] = mcpSessionId;
  }

  if (!mcpSessionId) {
    logger.info('Initializing MCP session...');

    const initResp = await fetch(STITCH_MCP_URL, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'initialize',
        params: {
          protocolVersion: '2025-03-26',
          capabilities: {},
          clientInfo: { name: 'bolt-stitch-client', version: '1.0.0' },
        },
      }),
    });

    const sessionHeader = initResp.headers.get('mcp-session-id');

    if (sessionHeader) {
      mcpSessionId = sessionHeader;
      headers['Mcp-Session-Id'] = mcpSessionId;
    }

    const initBody = await initResp.text();
    logger.debug(`MCP init response: ${initBody.slice(0, 200)}`);

    await fetch(STITCH_MCP_URL, {
      method: 'POST',
      headers,
      body: JSON.stringify({ jsonrpc: '2.0', method: 'notifications/initialized' }),
    });

    const listResp = await fetch(STITCH_MCP_URL, {
      method: 'POST',
      headers,
      body: JSON.stringify({ jsonrpc: '2.0', id: 2, method: 'tools/list' }),
    });
    const listJson = (await listResp.json()) as { result?: { tools?: any[] } };
    const toolsList = listJson?.result?.tools || [];
    const toolNames = toolsList.map((t: any) => t.name);
    logger.info(`MCP available tools: ${JSON.stringify(toolNames)}`);

    for (const t of toolsList) {
      if (t.name === 'generate_variants' || t.name === 'generate_screen_from_text' || t.name === 'get_screen') {
        logger.info(`Tool "${t.name}" inputSchema: ${JSON.stringify(t.inputSchema).slice(0, 2000)}`);
      }
    }
  }

  logger.info(`Calling MCP tool: ${toolName}`);

  const resp = await fetch(STITCH_MCP_URL, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: Date.now(),
      method: 'tools/call',
      params: { name: toolName, arguments: args },
    }),
  });

  const contentType = resp.headers.get('content-type') || '';

  if (contentType.includes('text/event-stream')) {
    const text = await resp.text();
    const lines = text.split('\n');

    for (const line of lines) {
      if (line.startsWith('data: ')) {
        try {
          const parsed = JSON.parse(line.slice(6));

          if (parsed.result) {
            const result = parsed.result;

            if (result.structuredContent) {
              return result.structuredContent;
            }

            if (result.content) {
              const textContent = result.content.find((c: any) => c.type === 'text');

              if (textContent?.text) {
                try {
                  return JSON.parse(textContent.text);
                } catch {
                  return textContent.text;
                }
              }
            }

            return result;
          }
        } catch {
          // skip non-JSON lines
        }
      }
    }

    throw new Error(`No valid result in SSE stream for tool ${toolName}`);
  }

  const json = (await resp.json()) as {
    error?: unknown;
    result?: {
      isError?: boolean;
      content?: any[];
      structuredContent?: any;
    };
  };

  if (json.error) {
    throw new Error(`MCP error: ${JSON.stringify(json.error)}`);
  }

  const result = json.result;

  if (!result) {
    throw new Error(`No result from tool ${toolName}: ${JSON.stringify(json)}`);
  }

  if (result.isError) {
    const errorText = (result.content || []).map((c: any) => (c.type === 'text' ? c.text : '')).join('');
    throw new Error(`Stitch tool error [${toolName}]: ${errorText}`);
  }

  if (result.structuredContent) {
    return result.structuredContent;
  }

  if (result.content) {
    const textContent = result.content.find((c: any) => c.type === 'text');

    if (textContent?.text) {
      try {
        return JSON.parse(textContent.text);
      } catch {
        return textContent.text;
      }
    }
  }

  return result;
}

function extractScreenId(data: any): string | null {
  if (typeof data === 'string') {
    const match = data.match(/screens\/([^/]+)/);
    return match ? match[1] : data;
  }

  if (data?.name && typeof data.name === 'string') {
    const match = data.name.match(/screens\/([^/]+)/);

    if (match) {
      return match[1];
    }
  }

  if (data?.screenId) {
    return data.screenId;
  }

  if (data?.outputComponents && Array.isArray(data.outputComponents)) {
    for (const comp of data.outputComponents) {
      if (comp?.name && typeof comp.name === 'string') {
        const match = comp.name.match(/screens\/([^/]+)/);

        if (match) {
          return match[1];
        }
      }

      if (comp?.screenId) {
        return comp.screenId;
      }

      if (comp?.design?.screens && Array.isArray(comp.design.screens)) {
        for (const s of comp.design.screens) {
          const id = extractScreenId(s);

          if (id) {
            return id;
          }
        }
      }

      if (comp?.screens && Array.isArray(comp.screens)) {
        for (const s of comp.screens) {
          const id = extractScreenId(s);

          if (id) {
            return id;
          }
        }
      }

      if (comp?.screen) {
        const id = extractScreenId(comp.screen);

        if (id) {
          return id;
        }
      }
    }
  }

  if (data?.screen) {
    return extractScreenId(data.screen);
  }

  if (data?.screens && Array.isArray(data.screens)) {
    for (const s of data.screens) {
      const id = extractScreenId(s);

      if (id) {
        return id;
      }
    }
  }

  return null;
}

function extractProjectId(data: any): string | null {
  if (typeof data === 'string') {
    return data;
  }

  if (data?.name && typeof data.name === 'string') {
    const match = data.name.match(/projects\/([^/]+)/);
    return match ? match[1] : data.name;
  }

  if (data?.projectId) {
    return data.projectId;
  }

  return null;
}

export function createStitchDesignTool(
  getApiKeys: () => Record<string, string>,
  getEnv: () => Env | undefined,
  getDataStream?: () => import('ai').DataStreamWriter | undefined,
  getKeepAlive?: () => (() => void) | undefined,
) {
  return tool({
    description:
      'Generate professional website mockups using Google Stitch AI. ' +
      'Creates 2 design variants based on a creative brief. ' +
      'Screenshots award-winning websites as visual references and feeds them to Stitch for inspiration. ' +
      'Users can provide their own reference_urls of websites they find beautiful. ' +
      'Returns screenshot previews, HTML for each variant, and a design system (palette, typography, features). ' +
      'Use when a user asks to create a website for a business.',
    parameters: z.object({
      niche: z.string().describe('The business industry (e.g. "plumber", "restaurant", "dentist", "photographer")'),
      business_name: z.string().optional().describe('The business name (e.g. "PlombExpert", "Chez Mario")'),
      colors: z
        .string()
        .optional()
        .describe('Brand colors described naturally (e.g. "blue and white", "dark navy #1a1a2e with gold accents")'),
      typography_style: z
        .enum([
          'modern',
          'elegant',
          'bold',
          'minimalist',
          'classic',
          'playful',
          'luxury',
          'geometric',
          'editorial',
          'futuristic',
        ])
        .optional()
        .describe('Typography style preference'),
      style_description: z
        .string()
        .optional()
        .describe('Additional style notes from the user (e.g. "luxurious feel", "playful and colorful")'),
      reference_urls: z
        .array(z.string().url())
        .optional()
        .describe(
          'URLs of websites the user wants to use as visual reference (e.g. ["https://stripe.com", "https://linear.app"]). The tool will screenshot these and use them as design inspiration.',
        ),
    }),
    // eslint-disable-next-line @typescript-eslint/naming-convention
    execute: async ({ niche, business_name, colors, typography_style, style_description, reference_urls }) => {
      logger.info(`Stitch design: niche="${niche}", business="${business_name || 'unnamed'}"`);

      const ds = getDataStream?.();
      const keepAlive = getKeepAlive?.();
      let progressOrder = 100;

      const emitProgress = (label: string, status: 'in-progress' | 'complete', message: string) => {
        try {
          ds?.writeData({ type: 'progress', label, status, order: progressOrder++, message });
          keepAlive?.();
        } catch {
          /* stream may be closed */
        }
      };

      const withHeartbeat = async <T>(promise: Promise<T>, intervalMs = 30_000): Promise<T> => {
        const timer = setInterval(() => {
          keepAlive?.();
        }, intervalMs);

        try {
          return await promise;
        } finally {
          clearInterval(timer);
        }
      };

      const emitDesignCards = (
        designs: DesignResult[],
        projectId?: string,
        designSys?: DesignSystemResult,
        loading?: boolean,
        totalExpected?: number,
      ) => {
        try {
          ds?.writeMessageAnnotation({
            type: 'designCards' as const,
            designs: designs as unknown as import('ai').JSONValue[],
            ...(projectId ? { projectId } : {}),
            ...(designSys ? { designSystem: designSys as unknown as Record<string, import('ai').JSONValue> } : {}),
            ...(loading !== undefined ? { loading } : {}),
            ...(totalExpected !== undefined ? { totalExpected } : {}),
          } as import('ai').JSONValue);
        } catch {
          /* stream may be closed */
        }
      };

      const designSystem = buildDesignSystem(business_name || niche, niche, colors, typography_style);
      let didEmitLoadingCards = false;
      let lastEmittedBaseDesigns: DesignResult[] = [];

      const apiKeys = getApiKeys();
      const env = getEnv();
      const stitchKey = apiKeys?.STITCH_API_KEY || (env as unknown as Record<string, string>)?.STITCH_API_KEY;

      if (!stitchKey) {
        return {
          success: false,
          designSystem,
          message: 'STITCH_API_KEY not configured.',
        };
      }

      try {
        mcpSessionId = null;

        const tavilyKey = apiKeys?.TAVILY_API_KEY || (env as unknown as Record<string, string>)?.TAVILY_API_KEY;

        emitProgress('stitch', 'in-progress', "Analyse du projet et recherche d'inspiration...");

        const [projectRaw, designRefs, screenshots, brief] = await Promise.all([
          (async () => {
            const title = business_name || `${niche} website`;
            logger.info(`Creating Stitch project: "${title}"`);

            return callStitchMCP(stitchKey, 'create_project', { title });
          })(),
          fetchDesignReferences(niche, tavilyKey || undefined),
          collectScreenshots(niche, typography_style, reference_urls, tavilyKey || undefined),
          (async () => buildCreativeBrief(niche, business_name, colors, typography_style, style_description, []))(),
        ]);

        const projectId = extractProjectId(projectRaw);
        logger.info(`Project created: ${projectId}`);
        logger.debug(`Project raw: ${JSON.stringify(projectRaw).slice(0, 500)}`);

        if (!projectId) {
          throw new Error(`Could not extract projectId from: ${JSON.stringify(projectRaw).slice(0, 300)}`);
        }

        emitProgress('stitch', 'in-progress', 'Références collectées, génération du design principal...');

        const briefWithRefs =
          designRefs.length > 0
            ? buildCreativeBrief(niche, business_name, colors, typography_style, style_description, designRefs)
            : brief;

        /*
         * Strategy: try generate_screen_from_image with a real website screenshot first,
         * fall back to generate_screen_from_text if no screenshot or if image tool fails
         */
        let screenRaw: any = null;
        let usedImageRef = false;

        if (screenshots.length > 0) {
          logger.info(`Attempting generate_screen_from_image with ${screenshots.length} screenshot(s)...`);

          const bestScreenshot = screenshots[0];

          try {
            const base64Data = await fetchScreenshotAsBase64(bestScreenshot.screenshotUrl);

            if (base64Data) {
              logger.info(
                `Screenshot fetched as base64 (${Math.round(base64Data.length / 1024)}KB), calling generate_screen_from_image...`,
              );

              const imagePrompt = [
                briefWithRefs,
                '',
                `RÉFÉRENCE VISUELLE PRINCIPALE :`,
                `Ce screenshot provient de ${bestScreenshot.sourceUrl}.`,
                `Pourquoi cette référence : ${bestScreenshot.why}`,
                '',
                "INSTRUCTIONS D'UTILISATION DE LA RÉFÉRENCE :",
                '- Analyse la STRUCTURE du layout : comment les sections sont organisées, la hiérarchie visuelle, les espacements',
                '- Reprends les PATTERNS qui fonctionnent : navigation, hero, grids, cards, CTAs, footer',
                '- Note la QUALITÉ : ombres, border-radius, transitions, micro-détails',
                '- Mais ADAPTE tout au contexte de notre client français : contenu en français, niche spécifique, palette de couleurs du brief',
                '- Le résultat final doit être SUPÉRIEUR visuellement à cette référence — plus moderne, plus soigné, plus cohérent',
              ].join('\n');

              screenRaw = await withHeartbeat(
                callStitchMCP(stitchKey, 'generate_screen_from_image', {
                  projectId,
                  imageUri: base64Data,
                  prompt: imagePrompt,
                  deviceType: 'DESKTOP',
                  modelId: 'GEMINI_3_1_PRO',
                }),
              );
              usedImageRef = true;
              logger.info('generate_screen_from_image succeeded!');
            }
          } catch (imgErr) {
            logger.warn(`generate_screen_from_image failed: ${imgErr instanceof Error ? imgErr.message : imgErr}`);
            logger.info('Falling back to generate_screen_from_text...');
          }
        }

        if (!screenRaw) {
          let enhancedBrief = briefWithRefs;

          if (screenshots.length > 0) {
            const screenshotRefs = screenshots.map((s) => `- ${s.sourceUrl} → ${s.why}`).join('\n');
            enhancedBrief += [
              '',
              '',
              'SITES DE RÉFÉRENCE VISUELS (analyse ces sites et inspire-toi de leurs meilleurs éléments) :',
              screenshotRefs,
              '',
              'Pour chaque référence, reprends : la structure du layout, les patterns de navigation, la hiérarchie des sections, les micro-détails (ombres, radius, spacing).',
              'Combine le meilleur de chaque référence et crée quelque chose de SUPÉRIEUR. Adapte tout au contexte français du client.',
            ].join('\n');
          }

          logger.info(`Generating base screen via text prompt...`);
          screenRaw = await withHeartbeat(
            callStitchMCP(stitchKey, 'generate_screen_from_text', {
              projectId,
              prompt: enhancedBrief,
              deviceType: 'DESKTOP',
              modelId: 'GEMINI_3_1_PRO',
            }),
          );
        }

        logger.debug(`Screen raw (full): ${JSON.stringify(screenRaw).slice(0, 3000)}`);
        logger.debug(`Screen raw keys: ${JSON.stringify(Object.keys(screenRaw || {}))}`);

        if (screenRaw?.outputComponents) {
          logger.debug(`outputComponents count: ${screenRaw.outputComponents.length}`);

          for (let ci = 0; ci < screenRaw.outputComponents.length; ci++) {
            const comp = screenRaw.outputComponents[ci];
            logger.debug(`outputComponents[${ci}] keys: ${JSON.stringify(Object.keys(comp || {}))}`);

            if (comp?.name) {
              logger.debug(`outputComponents[${ci}].name: ${comp.name}`);
            }

            if (comp?.design) {
              logger.debug(`outputComponents[${ci}].design keys: ${JSON.stringify(Object.keys(comp.design))}`);
              logger.debug(`outputComponents[${ci}].design: ${JSON.stringify(comp.design).slice(0, 2000)}`);
            }
          }
        }

        if (screenRaw?.projectId) {
          logger.debug(`Response projectId: ${screenRaw.projectId}`);
        }

        if (screenRaw?.sessionId) {
          logger.debug(`Response sessionId: ${screenRaw.sessionId}`);
        }

        const baseScreenId = extractScreenId(screenRaw);
        logger.info(`Base screen created: ${baseScreenId}`);

        if (!baseScreenId) {
          throw new Error(`Could not extract screenId from: ${JSON.stringify(screenRaw).slice(0, 300)}`);
        }

        // Emit base screen immediately so the user sees something right away
        {
          let baseImageUrl = '';
          let baseHtmlUrl = '';

          if (screenRaw?.screenshot?.downloadUrl) {
            baseImageUrl = screenRaw.screenshot.downloadUrl;
          } else if (screenRaw?.screenshot?.imageUri) {
            baseImageUrl = screenRaw.screenshot.imageUri;
          } else if (screenRaw?.thumbnailScreenshot?.downloadUrl) {
            baseImageUrl = screenRaw.thumbnailScreenshot.downloadUrl;
          }

          if (screenRaw?.htmlCode?.downloadUrl) {
            baseHtmlUrl = screenRaw.htmlCode.downloadUrl;
          } else if (screenRaw?.html?.htmlUri) {
            baseHtmlUrl = screenRaw.html.htmlUri;
          }

          if (!baseImageUrl && screenRaw?.outputComponents) {
            for (const comp of screenRaw.outputComponents) {
              const s = comp?.design?.screens?.[0] || comp?.screens?.[0] || comp?.screen;

              if (s?.screenshot?.downloadUrl) {
                baseImageUrl = s.screenshot.downloadUrl;
                break;
              }

              if (s?.screenshot?.imageUri) {
                baseImageUrl = s.screenshot.imageUri;
                break;
              }

              if (s?.thumbnailScreenshot?.downloadUrl) {
                baseImageUrl = s.thumbnailScreenshot.downloadUrl;
                break;
              }
            }
          }

          if (baseImageUrl || baseHtmlUrl) {
            lastEmittedBaseDesigns = [
              {
                option: 1,
                title: 'Design principal',
                imageUrl: baseImageUrl,
                htmlUrl: baseHtmlUrl,
                screenId: baseScreenId,
              },
            ];
            emitDesignCards(lastEmittedBaseDesigns, projectId, designSystem, true, 2);
            didEmitLoadingCards = true;
            emitProgress('stitch', 'in-progress', 'Premier design prêt ! Génération des variantes...');
          }
        }

        try {
          logger.info('Creating native Stitch design system...');

          const dsRaw = await callStitchMCP(stitchKey, 'create_design_system', {
            projectId,
            prompt: `Create a cohesive design system for a premium ${niche} business in France called "${business_name || niche}". The design system should enforce consistent typography, color palette, spacing, and component styles across all pages. Style: ${typography_style || 'modern'}.`,
          });

          const dsId =
            dsRaw?.designSystem?.name?.match(/designSystems\/([^/]+)/)?.[1] ||
            dsRaw?.name?.match(/designSystems\/([^/]+)/)?.[1] ||
            dsRaw?.designSystemId;

          if (dsId) {
            logger.info(`Design system created: ${dsId}`);

            await callStitchMCP(stitchKey, 'apply_design_system', {
              projectId,
              designSystemId: dsId,
              screenIds: [baseScreenId],
            });
            logger.info('Design system applied to base screen');
          } else {
            logger.debug(`Design system response: ${JSON.stringify(dsRaw).slice(0, 500)}`);
          }
        } catch (dsErr) {
          logger.warn(`Design system creation skipped: ${dsErr instanceof Error ? dsErr.message : dsErr}`);
        }

        emitProgress('stitch', 'in-progress', 'Création des 2 variantes de design...');

        logger.info('Generating 2 design variants (REIMAGINE)...');

        const variantArgs = {
          projectId,
          selectedScreenIds: [baseScreenId],
          prompt: briefWithRefs,
          variantOptions: {
            variantCount: 2,
            creativeRange: 'REIMAGINE',
            aspects: ['COLOR_SCHEME', 'LAYOUT', 'TEXT_FONT', 'IMAGES', 'TEXT_CONTENT'],
          },
          deviceType: 'DESKTOP',
          modelId: 'GEMINI_3_1_PRO',
        };
        logger.debug(`generate_variants args: ${JSON.stringify(variantArgs).slice(0, 1000)}`);

        const variantsRaw = await withHeartbeat(callStitchMCP(stitchKey, 'generate_variants', variantArgs));
        logger.debug(`Variants raw (full): ${JSON.stringify(variantsRaw).slice(0, 3000)}`);
        logger.debug(`Variants raw keys: ${JSON.stringify(Object.keys(variantsRaw || {}))}`);

        if (variantsRaw?.outputComponents) {
          logger.debug(`Variants outputComponents count: ${variantsRaw.outputComponents.length}`);

          for (let ci = 0; ci < variantsRaw.outputComponents.length; ci++) {
            const comp = variantsRaw.outputComponents[ci];
            logger.debug(`Variants outputComponents[${ci}] keys: ${JSON.stringify(Object.keys(comp || {}))}`);

            if (comp?.name) {
              logger.debug(`Variants outputComponents[${ci}].name: ${comp.name}`);
            }
          }
        }

        const designs: DesignResult[] = [];

        const variantScreens: any[] = [];

        if (variantsRaw?.outputComponents) {
          for (const comp of variantsRaw.outputComponents) {
            if (comp?.design?.screens && Array.isArray(comp.design.screens)) {
              variantScreens.push(...comp.design.screens);
            }
          }
        }

        if (variantScreens.length === 0 && Array.isArray(variantsRaw?.screens)) {
          variantScreens.push(...variantsRaw.screens);
        }

        logger.info(`Found ${variantScreens.length} variant screen(s) in response`);

        if (variantScreens.length > 0) {
          for (let i = 0; i < variantScreens.length; i++) {
            const screen = variantScreens[i];
            const sid = screen?.id || extractScreenId(screen);

            let imageUrl = '';
            let htmlUrl = '';

            if (screen?.screenshot?.downloadUrl) {
              imageUrl = screen.screenshot.downloadUrl;
            } else if (screen?.screenshot?.imageUri) {
              imageUrl = screen.screenshot.imageUri;
            } else if (screen?.thumbnailScreenshot?.downloadUrl) {
              imageUrl = screen.thumbnailScreenshot.downloadUrl;
            }

            if (screen?.htmlCode?.downloadUrl) {
              htmlUrl = screen.htmlCode.downloadUrl;
            } else if (screen?.html?.htmlUri) {
              htmlUrl = screen.html.htmlUri;
            }

            if (imageUrl || htmlUrl) {
              designs.push({
                option: i + 1,
                title: screen?.title || `Design ${i + 1}`,
                imageUrl,
                htmlUrl,
                screenId: sid || `variant-${i}`,
              });
              logger.info(`Design ${i + 1}: screenshot=${imageUrl ? 'yes' : 'no'}, html=${htmlUrl ? 'yes' : 'no'}`);
            } else {
              logger.warn(`Variant screen ${i} has no URLs. Keys: ${JSON.stringify(Object.keys(screen || {}))}`);
            }
          }
        }

        if (designs.length === 0) {
          logger.warn('No designs from variants, trying get_screen on base screen...');

          try {
            const screenData = await callStitchMCP(stitchKey, 'get_screen', {
              projectId,
              screenId: baseScreenId,
              name: `projects/${projectId}/screens/${baseScreenId}`,
            });

            let imageUrl = '';
            let htmlUrl = '';

            if (screenData?.screenshot?.downloadUrl) {
              imageUrl = screenData.screenshot.downloadUrl;
            } else if (screenData?.screenshot?.imageUri) {
              imageUrl = screenData.screenshot.imageUri;
            }

            if (screenData?.htmlCode?.downloadUrl) {
              htmlUrl = screenData.htmlCode.downloadUrl;
            } else if (screenData?.html?.htmlUri) {
              htmlUrl = screenData.html.htmlUri;
            }

            if (imageUrl || htmlUrl) {
              designs.push({
                option: 1,
                title: 'Design 1',
                imageUrl,
                htmlUrl,
                screenId: baseScreenId,
              });
            }
          } catch (err) {
            logger.warn(`Failed to get base screen: ${err}`);
          }
        }

        if (designs.length === 0) {
          if (didEmitLoadingCards) {
            emitDesignCards(lastEmittedBaseDesigns, undefined, designSystem, false);
          }

          return {
            success: false,
            designSystem,
            message: 'Stitch generated designs but failed to retrieve screenshots/HTML.',
          };
        }

        emitDesignCards(designs, projectId, designSystem, false);
        emitProgress('stitch', 'complete', `${designs.length} designs générés avec succès`);

        return {
          success: true,
          niche,
          businessName: business_name || niche,
          projectId,
          designCount: designs.length,
          designs,
          designSystem,
          usedImageReference: usedImageRef,
          referenceWebsites: screenshots.map((s) => s.sourceUrl),
          instructions:
            "IMPORTANT : Les design cards seront affichées automatiquement via l'annotation du chat UI. " +
            "Dans ta réponse texte, présente brièvement les options et demande à l'utilisateur de cliquer sur le design qu'il préfère. " +
            "Quand l'utilisateur sélectionne un design, le code HTML source COMPLET sera injecté directement dans son message. " +
            'Tu dois OBLIGATOIREMENT reproduire ce HTML PIXEL-PERFECT en projet React + Vite + TypeScript (TSX) + Tailwind CSS. ' +
            'Garde EXACTEMENT le même layout, les mêmes sections, couleurs, polices, espacements et images. ' +
            'Convertis le CSS inline et les classes en équivalents Tailwind. ' +
            "Adapte le contenu textuel au business de l'utilisateur mais garde la structure visuelle IDENTIQUE. " +
            'IMPORTANT JSX : Échappe TOUJOURS les caractères spéciaux dans le texte JSX — utilise &lt; pour <, &gt; pour >, &amp; pour &. Ne JAMAIS écrire un < ou > brut dans du texte JSX, sinon le build React cassera.',
        };
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        logger.error(`Stitch design generation failed: ${message}`);

        if (didEmitLoadingCards) {
          emitDesignCards(lastEmittedBaseDesigns, undefined, designSystem, false);
        }

        return {
          success: false,
          designSystem,
          error: `Stitch failed: ${message}`,
          message: 'Stitch generation failed. Try again or use design_inspiration as fallback.',
        };
      }
    },
  });
}

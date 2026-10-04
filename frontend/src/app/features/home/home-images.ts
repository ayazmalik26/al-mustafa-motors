/** Decorative editorial photography (free Unsplash images). The hero image itself is set in admin settings. */
const u = (id: string, w: number) => `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=${w}&q=80`;

export const HOME_IMAGES = {
  heroFallback: { url: u('1650530579355-7ad9d4766043', 2000) },
  showroomRow: { url: u('1758393461426-6b5f9b143825', 1600), thumbUrl: u('1758393461426-6b5f9b143825', 800) },
  assistance: { url: u('1625047509248-ec889cbff17f', 1400), thumbUrl: u('1625047509248-ec889cbff17f', 700) },
  sell: { url: u('1714213624189-9a9fc8a0736a', 1600), thumbUrl: u('1714213624189-9a9fc8a0736a', 800) },
};

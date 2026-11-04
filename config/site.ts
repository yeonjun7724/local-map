// Existing map, feature, and language behavior is centralized here.
export const siteConfig = {
  brand: {
    name: '호수산책',
    taglineKo: '아이와 함께, 가까운 자연으로',
    taglineEn: 'Small walks, happy family days.',
  },
  region: {
    nameKo: '일산 호수공원 일대',
    nameEn: 'Ilsan Lake Park',
    // Supplied park representative point; not a verified facility location.
    center: [126.76890828, 37.65528473] as [number, number],
    zoom: 15.5,
  },
  map: {
    style: 'https://tiles.openfreemap.org/styles/liberty',
    attributionControl: false as const,
  },
  features: {
    themes: true,
    sharing: true,
  },
  languages: {
    default: 'ko',
    supported: ['ko'],
  },
};

export default siteConfig;

/**
 * @license
 * madtype - Lyrics, YouTube Transcript & LRCLIB Synchronization Engine
 * Handles LRC/SRT/YouTube Transcript parsing, duration-aware LRCLIB API matching,
 * YouTube title cleaning, timestamp boundary calculation, and multi-language subtitles.
 */

export const LYRIC_LANGUAGES = [
  { code: 'auto', label: 'Deteksi Otomatis' },
  { code: 'en', label: 'English (Inggris)' },
  { code: 'id', label: 'Bahasa Indonesia' },
  { code: 'ms', label: 'Bahasa Melayu' },
  { code: 'tl', label: 'Tagalog / Filipino' },
  { code: 'ja', label: '日本語 (Jepang)' },
  { code: 'ko', label: '한국어 (Korea)' },
  { code: 'zh-CN', label: '中文 (Mandarin)' },
  { code: 'es', label: 'Español (Spanyol)' },
  { code: 'fr', label: 'Français (Prancis)' },
  { code: 'de', label: 'Deutsch (Jerman)' },
  { code: 'it', label: 'Italiano (Italia)' },
  { code: 'pt', label: 'Português (Portugis)' },
  { code: 'th', label: 'ไทย (Thailand)' },
  { code: 'vi', label: 'Tiếng Việt (Vietnam)' },
  { code: 'ar', label: 'العربية (Arab)' },
];

export const SUBTITLE_LANGUAGES = LYRIC_LANGUAGES.filter(l => l.code !== 'auto');

export function normalizeLangCode(code) {
  if (!code || typeof code !== 'string') return '';
  const raw = code.trim();
  if (!raw) return '';
  const lower = raw.toLowerCase();

  const exact = LYRIC_LANGUAGES.find(l => l.code.toLowerCase() === lower);
  if (exact) return exact.code;

  if (lower === 'zh' || lower.startsWith('zh-hans') || lower === 'zh-sg') return 'zh-CN';
  if (lower.startsWith('zh-hant') || lower === 'zh-tw' || lower === 'zh-hk') return 'zh-TW';

  const base = lower.split(/[-_]/)[0];
  const baseMatch = LYRIC_LANGUAGES.find(l => l.code.toLowerCase() === base);
  return baseMatch ? baseMatch.code : raw;
}

export function getLanguageLabel(code) {
  if (!code) return 'Otomatis';
  const normalized = normalizeLangCode(code);
  const found = LYRIC_LANGUAGES.find(l => l.code.toLowerCase() === normalized.toLowerCase());
  if (found) return found.label;
  const base = String(code).split(/[-_]/)[0].toLowerCase();
  const baseMatch = LYRIC_LANGUAGES.find(l => l.code.toLowerCase() === base);
  return baseMatch ? baseMatch.label : code;
}

// Verified full-song synced lyrics keyed by exact YouTube videoId
// Each entry matches the exact audio/video timing on YouTube.
const BUILT_IN_SYNCS = {
  // Cinderella - Ang Boyfriend Kong Baduy (YouTube: 141HauTGBpQ, 02:56 = 176s)
  '141HauTGBpQ': {
    title: 'Ang Boyfriend Kong Baduy',
    artist: 'Cinderella',
    duration: 176,
    syncedLyrics: `
[00:01.72] Pa, pa-pa-pa, pa-pa-pa-pa, pa-pa
[00:06.05] 
[00:13.44] Ang aking boyfriend, mahilig sa disco
[00:21.00] Lagi sa disco, lahat ng Sabado
[00:27.50] And when the kids go dancing na, lagi pa s'yang nauuna
[00:35.51] At ang sayaw pala niya ay mashed potato
[00:43.42] 'Yan ang boyfriend ko, 'di ko ma-take ang gusto (ooh, la-la-la)
[00:52.53] S'ya ay in na in, ngunit out pa rin
[00:55.49] Ang boyfriend kong baduy, baduy
[01:02.04] 
[01:04.09] Ang aking boyfriend, ang groovy magdamit
[01:09.16] 
[01:11.37] At kung sa porma, mahirap lamangan
[01:18.35] But when we go out dating na, kulay ng polo n'ya'y pula
[01:25.60] Berde pa ang sapatos n'ya, asul ang medyas
[01:34.63] 'Yan ang boyfriend ko, 'di ko ma-take ang gusto (ooh, la-la-la)
[01:41.54] S'ya ay in na in, ngunit out pa rin
[01:45.36] Ang boyfriend kong baduy (sha-la-la-la-la), baduy (sha-la-la-la-la)
[01:53.49] Ang boyfriend kong baduy (sha-la-la-la-la), baduy (sha-la-la-la)
[01:57.06] 
[02:01.68] Pa, pa-pa-pa, pa-pa-pa-pa, pa-pa
[02:06.70] S'ya ay in na in, ngunit out pa rin
[02:14.49] Ang boyfriend kong baduy
[02:19.16] 'Yan ang boyfriend ko, 'di ko ma-take ang gusto (ooh, la-la-la)
[02:27.95] S'ya ay in na in, ngunit out pa rin
[02:31.39] Ang boyfriend kong baduy (sha-la-la-la-la), baduy (sha-la-la-la-la)
[02:35.99] Ang boyfriend kong baduy (sha-la-la-la-la), baduy (sha-la-la-la-la)
[02:43.73] Ang boyfriend kong baduy
[02:47.50] 
    `.trim(),
    translations: [
      'Pa, pa-pa-pa, pa-pa-pa-pa, pa-pa',
      'Pacarku ini sangat suka pergi ke disko',
      'Selalu pergi ke disko, setiap hari Sabtu',
      'Dan saat anak-anak mulai berdansa, dia selalu yang paling depan',
      'Dan ternyata tarian andalannya adalah mashed potato',
      'Itulah pacarku, seleranya sulit kutahan (ooh, la-la-la)',
      'Dia merasa paling kekinian, tapi tetap saja ketinggalan zaman',
      'Pacarku yang norak itu, norak',
      'Pacarku ini berdandan dengan gaya groovy',
      'Dan kalau soal penampilan, sulit untuk dikalahkan',
      'Tapi saat kami pergi kencan, warna bajunya merah menyala',
      'Sepatunya hijau pula, kaus kakinya biru',
      'Itulah pacarku, seleranya sulit kutahan (ooh, la-la-la)',
      'Dia merasa paling kekinian, tapi tetap saja ketinggalan zaman',
      'Pacarku yang norak itu (sha-la-la-la-la), norak',
      'Pacarku yang norak itu (sha-la-la-la-la), norak',
      'Pa, pa-pa-pa, pa-pa-pa-pa, pa-pa',
      'Dia merasa paling kekinian, tapi tetap saja ketinggalan zaman',
      'Pacarku yang norak itu',
      'Itulah pacarku, seleranya sulit kutahan (ooh, la-la-la)',
      'Dia merasa paling kekinian, tapi tetap saja ketinggalan zaman',
      'Pacarku yang norak itu (sha-la-la-la-la), norak',
      'Pacarku yang norak itu (sha-la-la-la-la), norak',
      'Pacarku yang norak itu',
    ]
  },

  // Coldplay - Yellow (YouTube Official Video: yKNxeF4KMsY, 04:33 = 273s)
  'yKNxeF4KMsY': {
    title: 'Yellow',
    artist: 'Coldplay',
    duration: 273,
    syncedLyrics: `
[00:34.89] Look at the stars
[00:37.55] Look how they shine for you
[00:43.16] And everything you do
[00:48.81] Yeah, they were all yellow
[00:51.48] I came along
[00:54.17] I wrote a song for you
[00:59.79] And all the things you do
[01:05.71] And it was called Yellow
[01:10.70] So then I took my turn
[01:16.12] Oh, what a thing to have done
[01:22.09] And it was all yellow
[01:26.07] 
[01:30.56] Your skin, oh yeah, your skin and bones
[01:35.22] Turn into something beautiful
[01:41.43] And you know, you know I love you so
[01:49.35] You know I love you so
[01:53.72] 
[02:14.10] I swam across
[02:16.91] I jumped across for you
[02:22.44] Oh, what a thing to do
[02:28.10] 'Cause you were all yellow
[02:30.74] I drew a line
[02:33.42] I drew a line for you
[02:38.98] Oh, what a thing to do
[02:44.71] And it was all yellow
[02:48.50] 
[02:53.23] And your skin, oh yeah, your skin and bones
[02:58.52] Turn into something beautiful
[03:04.03] And you know, for you, I'd bleed myself dry
[03:12.01] For you, I'd bleed myself dry
[03:17.06] 
[03:35.94] It's true
[03:39.78] Look how they shine for you
[03:45.10] Look how they shine for you
[03:50.78] Look how they shine for
[03:56.18] Look how they shine for you
[04:01.75] Look how they shine for you
[04:07.34] Look how they shine
[04:10.29] Look at the stars
[04:12.94] Look how they shine for you
[04:18.31] And all the things that you do
[04:24.00] 
    `.trim(),
    translations: [
      'Lihatlah bintang-bintang di langit',
      'Lihat bagaimana mereka bersinar untukmu',
      'Dan untuk segala hal yang kau lakukan',
      'Ya, semuanya berwarna kuning keemasan',
      'Aku pun datang menghampiri',
      'Kutuliskan sebuah lagu khusus untukmu',
      'Dan untuk semua hal yang kau lakukan',
      'Dan lagu itu berjudul Yellow',
      'Lalu giliranku pun tiba',
      'Oh, sungguh hal berarti yang telah kulakukan',
      'Dan semuanya bernuansa kuning hangat',
      'Kulitmu, oh ya, seluruh raga dan tulangmu',
      'Berubah menjadi sesuatu yang begitu indah',
      'Dan kau tahu, kau tahu aku sangat mencintaimu',
      'Kau tahu betapa aku sangat mencintaimu',
      'Aku berenang menyeberang',
      'Aku melompat menyeberang untukmu',
      'Oh, sungguh hal yang rela kulakukan',
      'Karena bagiku kaulah segalanya',
      'Kugambar sebuah garis batas',
      'Kugambar sebuah garis untukmu',
      'Oh, sungguh hal yang kulakukan',
      'Dan semuanya berwarna kuning keemasan',
      'Dan kulitmu, oh ya, seluruh raga dan tulangmu',
      'Berubah menjadi sesuatu yang begitu indah',
      'Dan kau tahu, untukmu aku rela berkorban segalanya',
      'Untukmu aku rela berkorban hingga titik terakhir',
      'Sungguh nyata adanya',
      'Lihat bagaimana mereka bersinar untukmu',
      'Lihat bagaimana mereka bersinar untukmu',
      'Lihat bagaimana mereka bersinar untuk...',
      'Lihat bagaimana mereka bersinar untukmu',
      'Lihat bagaimana mereka bersinar untukmu',
      'Lihat bagaimana mereka bersinar',
      'Lihatlah bintang-bintang di langit',
      'Lihat bagaimana mereka bersinar untukmu',
      'Dan segala hal yang kau lakukan',
    ]
  },

  // Queen - Bohemian Rhapsody (YouTube Official Video: fJ9rUzIMcZQ, 05:55 = 355s)
  'fJ9rUzIMcZQ': {
    title: 'Bohemian Rhapsody',
    artist: 'Queen',
    duration: 355,
    syncedLyrics: `
[00:00.42] Is this the real life?
[00:04.03] Is this just fantasy?
[00:07.58] Caught in a landslide
[00:10.35] No escape from reality
[00:14.74] Open your eyes
[00:17.70] Look up to the skies and see
[00:25.29] I'm just a poor boy, I need no sympathy
[00:31.02] Because I'm easy come, easy go
[00:35.39] Little high, little low
[00:38.75] Any way the wind blows doesn't really matter to me (to me)
[00:52.81] 
[00:55.42] Mama
[00:58.41] Just killed a man
[01:01.92] Put a gun against his head, pulled my trigger
[01:06.59] Now he's dead
[01:09.27] Mama, life had just begun
[01:15.36] But now I've gone and thrown it all away
[01:22.64] Mama, oo-oo-oo
[01:29.21] Didn't mean to make you cry
[01:32.75] If I'm not back again this time tomorrow
[01:37.50] Carry on, carry on as if nothing really matters
[01:46.37] 
[01:54.98] Too late, my time has come
[02:01.16] Sends shivers down my spine, body's aching all the time
[02:08.38] Goodbye, everybody, I've got to go
[02:14.94] Gotta leave you all behind and face the truth
[02:22.18] Mama, oo-oo-oo (the wind blows)
[02:29.02] I don't want to die
[02:32.26] I sometimes wish I'd never been born at all
[02:38.33] 
[03:06.26] I see a little silhouetto of a man
[03:09.01] Scaramouch, Scaramouch, will you do the Fandango?
[03:12.75] Thunderbolts and lightning, very, very frightening me
[03:16.35] Galileo, Galileo
[03:17.83] Galileo, Galileo
[03:19.48] Galileo, Figaro, magnifico, oh-oh-oh
[03:22.84] I'm just a poor boy nobody loves me
[03:26.09] He's just a poor boy from a poor family
[03:29.22] Spare him his life from this monstrosity
[03:33.84] Easy come, easy go, will you let me go?
[03:36.68] Bismillah! No, we will not let you go
[03:39.85] (Let him go!) Bismillah! We will not let you go
[03:43.13] (Let him go!) Bismillah! We will not let you go
[03:46.33] (Let me go) will not let you go
[03:47.78] (Let me go) never let you go
[03:49.05] (Let me go) (never) let you go (let me go)
[03:51.55] No, no, no, no, no, no, no
[03:54.27] Oh, mama mia, mama mia (mama mia, let me go)
[03:57.42] Beelzebub has a devil put aside for me, for me
[04:03.81] For me
[04:07.98] 
[04:15.01] So you think you can stop me and spit in my eye
[04:20.94] So you think you can love me and leave me to die
[04:26.06] Oh, baby, can't do this to me, baby
[04:33.12] Just gotta get out, just gotta get right outta here
[04:39.04] 
[04:55.22] Oo-oo
[05:00.13] Oh, yeah, oh, yeah
[05:05.53] 
[05:11.61] Nothing really matters, anyone can see
[05:18.67] Nothing really matters
[05:22.72] Nothing really matters to me
[05:31.01] 
[05:43.13] Any way the wind blows
[05:47.00] 
    `.trim(),
    translations: [
      'Apakah ini kehidupan nyata?',
      'Ataukah hanya sekadar khayalan fantasi?',
      'Terjebak dalam runtuhan tanah longsor',
      'Tak ada jalan keluar dari kenyataan ini',
      'Bukalah matamu',
      'Pandanglah ke atas langit dan saksikanlah',
      'Aku hanyalah anak malang, tak butuh belas kasihan',
      'Karena bagiku datang mudah, pergi pun mudah',
      'Kadang melayang tinggi, kadang terpuruk rendah',
      'Ke mana pun angin bertiup tak lagi berarti bagiku',
      'Mama',
      'Aku baru saja membunuh seseorang',
      'Kutodongkan pistol di kepalanya, kutarik pelatuknya',
      'Kini dia telah tiada',
      'Mama, hidupku padahal baru saja dimulai',
      'Namun kini semuanya telah kubuang sia-sia',
      'Mama, oo-oo-oo',
      'Tak pernah bermaksud membuatmu menangis',
      'Jika besok di waktu yang sama aku tak kembali lagi',
      'Teruskanlah hidupmu, seolah tiada hal yang berarti',
      'Sudah terlambat, waktuku telah tiba',
      'Mengirimkan rasa dingin di punggungku, sekujur tubuh terasa sakit',
      'Selamat tinggal semuanya, aku harus pergi',
      'Harus meninggalkan kalian semua dan menghadapi kenyataan',
      'Mama, oo-oo-oo (angin bertiup)',
      'Aku tak ingin mati',
      'Terkadang aku berharap tak pernah dilahirkan sama sekali',
      'Kulihat bayangan siluet seorang pria kecil',
      'Scaramouch, Scaramouch, maukah kau menari Fandango?',
      'Kilat dan guntur, sungguh sangat menakutkanku',
      'Galileo, Galileo',
      'Galileo, Galileo',
      'Galileo, Figaro, luar biasa, oh-oh-oh',
      'Aku hanyalah anak malang yang tak dicintai siapa pun',
      'Dia hanyalah anak malang dari keluarga miskin',
      'Selamatkan hidupnya dari kekejaman ini',
      'Datang mudah pergi mudah, maukah kau melepaskanku?',
      'Bismillah! Tidak, kami takkan melepaskanmu',
      '(Lepaskan dia!) Bismillah! Kami takkan melepaskanmu',
      '(Lepaskan dia!) Bismillah! Kami takkan melepaskanmu',
      '(Lepaskan aku) takkan melepaskanmu',
      '(Lepaskan aku) takkan pernah melepaskanmu',
      '(Lepaskan aku) takkan pernah melepaskanmu',
      'Tidak, tidak, tidak, tidak, tidak, tidak, tidak',
      'Oh, mama mia, mama mia (mama mia, lepaskan aku)',
      'Beelzebub telah menyiapkan iblis untukku, untukku',
      'Untukku',
      'Jadi kau pikir bisa menghentikanku dan meludahi mataku',
      'Jadi kau pikir bisa mencintaiku lalu meninggalkanku mati',
      'Oh, kasih, jangan lakukan ini padaku',
      'Aku hanya harus pergi, segera keluar dari tempat ini',
      'Oo-oo',
      'Oh, ya, oh, ya',
      'Tiada lagi yang benar-benar berarti, siapa pun bisa melihat',
      'Tiada lagi yang benar-benar berarti',
      'Tiada lagi yang berarti bagiku',
      'Ke mana pun arah angin berhembus',
    ]
  },

  // Ed Sheeran - Shape of You (YouTube Official Video: JGwWNGJdvx8, 04:23 = 263s)
  'JGwWNGJdvx8': {
    title: 'Shape of You',
    artist: 'Ed Sheeran',
    duration: 263,
    syncedLyrics: `
[00:11.00] The club isn't the best place to find a lover
[00:13.83] So the bar is where I go (mm-mm)
[00:16.21] Me and my friends at the table doing shots
[00:19.51] Drinking fast, and then we talk slow (mm-mm)
[00:20.18] You come over and start up a conversation with just me
[00:23.50] And trust me, I'll give it a chance now (mm-mm)
[00:26.05] Take my hand, stop, put "Van the Man" on the jukebox
[00:29.75] And then we start to dance
[00:30.55] And now I'm singing like
[00:32.45] Girl, you know I want your love
[00:33.48] Your love was handmade for somebody like me
[00:36.62] Come on now, follow my lead
[00:38.52] I may be crazy, don't mind me
[00:40.73] Say, "Boy, let's not talk too much
[00:43.48] Grab on my waist and put that body on me"
[00:46.63] Come on now, follow my lead
[00:48.30] Come, come on now, follow my lead
[00:50.22] (Mm-mm)
[00:51.83] I'm in love with the shape of you
[00:54.18] We push and pull like a magnet do
[00:56.87] Although my heart is falling too
[00:59.35] I'm in love with your body
[01:01.69] Last night you were in my room
[01:04.33] And now my bed sheets smell like you
[01:06.57] Every day discovering something brand new
[01:09.26] Oh, I'm in love with your body
[01:11.65] Oh I, oh I, oh I, oh I
[01:14.13] Oh, I'm in love with your body
[01:16.56] Oh I, oh I, oh I, oh I
[01:19.14] Oh, I'm in love with your body
[01:21.50] Oh I, oh I, oh I, oh I
[01:24.26] Oh, I'm in love with your body
[01:26.37] Every day discovering something brand new
[01:29.31] I'm in love with the shape of you
[01:31.48] One week in we let the story begin
[01:33.25] We're going out on our first date (mm-mm)
[01:36.11] But you and me are thrifty, so go all-you-can-eat
[01:39.23] Fill up your bag, and I fill up a plate (mm-mm)
[01:40.61] We talk for hours and hours about the sweet and the sour
[01:43.27] And how your family is doing okay (mm-mm)
[01:46.09] And leave and get in a taxi, then kiss in the back seat
[01:48.69] Tell the driver make the radio play
[01:50.29] And I'm singing like
[01:51.82] Girl, you know I want your love
[01:53.03] Your love was handmade for somebody like me
[01:56.58] Come on now, follow my lead
[01:58.45] I may be crazy, don't mind me
[02:00.44] Say, "Boy, let's not talk too much
[02:03.20] Grab on my waist and put that body on me"
[02:06.59] Come on now, follow my lead
[02:08.22] Come, come on now, follow my lead
[02:10.48] (Mm-mm)
[02:11.85] I'm in love with the shape of you
[02:14.32] We push and pull like a magnet do
[02:16.81] Although my heart is falling too
[02:19.43] I'm in love with your body
[02:21.89] Last night you were in my room
[02:24.27] And now my bed sheets smell like you
[02:26.55] Every day discovering something brand new
[02:29.34] Oh, I'm in love with your body
[02:31.41] Oh I, oh I, oh I, oh I
[02:34.25] Oh, I'm in love with your body
[02:36.40] Oh I, oh I, oh I, oh I
[02:39.18] Oh, I'm in love with your body
[02:41.46] Oh I, oh I, oh I, oh I
[02:44.48] Oh, I'm in love with your body
[02:46.54] Every day discovering something brand new
[02:49.78] I'm in love with the shape of you
[02:51.42] Come on, be my baby, come on
[02:53.85] Come on, be my baby, come on
[02:56.26] Come on, be my baby, come on
[02:58.71] Come on, be my baby, come on
[03:01.25] Come on, be my baby, come on
[03:03.75] Come on, be my baby, come on
[03:06.03] Come on, be my baby, come on
[03:08.28] Come on, be my baby, come on
[03:11.54] I'm in love with the shape of you
[03:14.19] We push and pull like a magnet do
[03:16.52] Although my heart is falling too
[03:19.34] I'm in love with your body
[03:22.08] Last night you were in my room
[03:24.35] And now my bed sheets smell like you
[03:26.73] Every day discovering something brand new
[03:29.23] Oh, I'm in love with your body
[03:31.68] Come on, be my baby, come on
[03:33.55] Come on, be my baby, come on (I'm in love with your body)
[03:36.55] Come on, be my baby, come on
[03:38.47] Come on, be my baby, come on (oh, I'm in love with your body)
[03:42.12] Come on, be my baby, come on
[03:43.41] Come on, be my baby, come on (I'm in love with your body)
[03:46.61] Every day discovering something brand new
[03:48.84] I'm in love with the shape of you
[03:52.00] 
    `.trim(),
    translations: []
  },

  // Rick Astley - Never Gonna Give You Up (YouTube Official Video: dQw4w9WgXcQ, 03:33 = 214s)
  'dQw4w9WgXcQ': {
    title: 'Never Gonna Give You Up',
    artist: 'Rick Astley',
    duration: 214,
    syncedLyrics: `
[00:18.92] We're no strangers to love
[00:22.59] You know the rules and so do I (do I)
[00:26.93] A full commitment's what I'm thinking of
[00:31.35] You wouldn't get this from any other guy
[00:35.14] I just wanna tell you how I'm feeling
[00:40.28] Gotta make you understand
[00:42.83] Never gonna give you up
[00:45.22] Never gonna let you down
[00:47.14] Never gonna run around and desert you
[00:51.40] Never gonna make you cry
[00:53.88] Never gonna say goodbye
[00:55.67] Never gonna tell a lie and hurt you
[01:00.52] We've known each other for so long
[01:05.04] Your heart's been aching, but you're too shy to say it (say it)
[01:09.42] Inside, we both know what's been going on (going on)
[01:13.11] We know the game and we're gonna play it
[01:17.29] And if you ask me how I'm feeling
[01:22.51] Don't tell me you're too blind to see
[01:25.33] Never gonna give you up
[01:27.47] Never gonna let you down
[01:29.65] Never gonna run around and desert you
[01:33.42] Never gonna make you cry
[01:35.82] Never gonna say goodbye
[01:37.78] Never gonna tell a lie and hurt you
[01:41.99] Never gonna give you up
[01:44.10] Never gonna let you down
[01:46.43] Never gonna run around and desert you
[01:50.26] Never gonna make you cry
[01:52.56] Never gonna say goodbye
[01:54.79] Never gonna tell a lie and hurt you
[01:59.22] (Ooh, give you up)
[02:02.98] (Ooh, give you up)
[02:07.08] (Ooh) Never gonna give, never gonna give (give you up)
[02:11.26] (Ooh) Never gonna give, never gonna give (give you up)
[02:16.13] We've known each other for so long
[02:20.53] Your heart's been aching, but you're too shy to say it (to say it)
[02:24.65] Inside, we both know what's been going on (going on)
[02:28.87] We know the game and we're gonna play it
[02:32.55] I just wanna tell you how I'm feeling
[02:37.79] Gotta make you understand
[02:40.88] Never gonna give you up
[02:42.94] Never gonna let you down
[02:45.16] Never gonna run around and desert you
[02:49.00] Never gonna make you cry
[02:51.17] Never gonna say goodbye
[02:53.78] Never gonna tell a lie and hurt you
[02:57.61] Never gonna give you up
[02:59.47] Never gonna let you down
[03:02.00] Never gonna run around and desert you
[03:05.95] Never gonna make you cry
[03:08.34] Never gonna say goodbye
[03:10.45] Never gonna tell a lie and hurt you
[03:14.37] Never gonna give you up
[03:16.37] Never gonna let you down
[03:18.84] Never gonna run around and desert you
[03:23.07] Never gonna make you cry
[03:25.17] Never gonna say goodbye
[03:27.38] Never gonna tell a lie and hurt you
[03:31.50] 
    `.trim(),
    translations: []
  },

  // The Weeknd - Blinding Lights (YouTube Official Video: 4NRXx6U8ABQ, 04:23 = 263s)
  '4NRXx6U8ABQ': {
    title: 'Blinding Lights',
    artist: 'The Weeknd',
    duration: 263,
    syncedLyrics: `
[00:35.96] Yeah
[00:38.50] 
[00:49.93] I've been tryna call
[00:53.34] I've been on my own for long enough
[00:56.24] Maybe you can show me how to love, maybe
[01:01.32] I'm going through withdrawals
[01:04.07] You don't even have to do too much
[01:06.99] You can turn me on with just a touch, baby
[01:12.40] I look around and
[01:14.04] Sin City's cold and empty (oh)
[01:16.60] No one's around to judge me (oh)
[01:19.48] I can't see clearly when you're gone
[01:23.66] I said, ooh, I'm blinded by the lights
[01:29.77] No, I can't sleep until I feel your touch
[01:34.97] I said, ooh, I'm drowning in the night
[01:41.03] Oh, when I'm like this, you're the one I trust
[01:45.40] (Hey, hey, hey)
[01:48.14] 
[01:57.33] I'm running out of time
[02:00.10] 'Cause I can see the sun light up the sky
[02:03.12] So I hit the road in overdrive, baby, oh
[02:09.83] The city's cold and empty (oh)
[02:12.84] No one's around to judge me (oh)
[02:15.74] I can't see clearly when you're gone
[02:20.01] I said, ooh, I'm blinded by the lights
[02:26.36] No, I can't sleep until I feel your touch
[02:33.28] I said, ooh, I'm drowning in the night
[02:39.76] Oh, when I'm like this, you're the one I trust
[02:45.29] I'm just walking by to let you know (by to let you know)
[02:48.57] I can never say it on the phone (say it on the phone)
[02:51.45] Will never let you go this time (ooh)
[02:56.58] I said, ooh, I'm blinded by the lights
[03:02.44] No, I can't sleep until I feel your touch
[03:07.02] (Hey, hey, hey)
[03:09.64] 
[03:17.82] (Hey, hey, hey)
[03:23.04] 
[03:29.98] I said, ooh, I'm blinded by the lights
[03:36.87] No, I can't sleep until I feel your touch
[03:41.50] 
    `.trim(),
    translations: []
  }
};

export class LyricsManager {
  constructor() {
    this.LRCLIB_BASE_URL = 'https://lrclib.net/api';
    this.lyricsData = []; // Array of { id, time, text, endTime, translation }
    this.candidateLyrics = []; // Alternative LRCLIB matches for current video
    this.activeCandidateId = null;
    this.sourceType = ''; // 'preset' | 'lrclib' | 'custom'
    this.rawLyrics = null;
    this.isSynced = false;
    this.detectedSourceLang = '';
    this.activeVideoId = '';
    this.availableYouTubeTracks = [];
    this.subtitleTracks = new Map();
    this.translationCache = new Map();
    this._translationRunId = 0;
    this.trackInfo = {
      title: '',
      artist: '',
      album: '',
      duration: 0,
    };
  }

  clearSubtitleTracks() {
    this.detectedSourceLang = '';
    this.availableYouTubeTracks = [];
    this.subtitleTracks.clear();
  }

  _trackKey(sourceLang = 'auto', targetLang = 'id') {
    return `${sourceLang || 'auto'}|${targetLang || 'id'}`;
  }

  setYouTubeCaptionTracks(tracks = []) {
    if (!Array.isArray(tracks)) {
      this.availableYouTubeTracks = [];
      return [];
    }
    const seen = new Set();
    const normalized = [];
    for (const t of tracks) {
      if (!t || !t.languageCode) continue;
      const rawCode = String(t.languageCode).trim();
      const baseCode = normalizeLangCode(rawCode);
      const dedupeKey = baseCode.toLowerCase();
      if (seen.has(dedupeKey)) continue;
      seen.add(dedupeKey);
      normalized.push({
        languageCode: rawCode,
        baseCode,
        displayName: t.languageName || t.displayName || t.name || getLanguageLabel(baseCode),
        isAutoGenerated: t.kind === 'asr',
      });
    }
    this.availableYouTubeTracks = normalized;
    return normalized;
  }

  getAvailableSubtitleOptions(videoId = this.activeVideoId, sourceLang = 'auto') {
    const sl = sourceLang || 'auto';
    const hasCuratedId = Boolean(
      videoId &&
      BUILT_IN_SYNCS[videoId]?.translations?.length > 0 &&
      (sl === 'auto' || sl === 'tl' || sl === 'en')
    );

    const ccByBase = new Map();
    for (const cc of this.availableYouTubeTracks) {
      ccByBase.set(cc.baseCode.toLowerCase(), cc);
    }

    const options = [];
    const includedCodes = new Set();

    for (const lang of SUBTITLE_LANGUAGES) {
      includedCodes.add(lang.code.toLowerCase());
      const ccMatch = ccByBase.get(lang.code.toLowerCase());
      const track = this.subtitleTracks.get(this._trackKey(sl, lang.code));
      const isCurated = lang.code === 'id' && hasCuratedId;
      const isCached = Boolean(track && track.complete);

      const badges = [];
      if (isCurated) badges.push('Terkurasi');
      else if (isCached) badges.push('Siap');
      if (ccMatch) badges.push('CC YouTube');

      options.push({
        code: lang.code,
        label: lang.label,
        displayLabel: badges.length > 0 ? `${lang.label} · ${badges.join(' / ')}` : lang.label,
        isCurated,
        isYouTubeCC: Boolean(ccMatch),
        isCached,
        youtubeLanguageCode: ccMatch ? ccMatch.languageCode : '',
      });
    }

    for (const cc of this.availableYouTubeTracks) {
      const code = cc.baseCode || cc.languageCode;
      if (includedCodes.has(code.toLowerCase())) continue;
      includedCodes.add(code.toLowerCase());
      const track = this.subtitleTracks.get(this._trackKey(sl, code));
      const isCached = Boolean(track && track.complete);
      const badges = ['CC YouTube'];
      if (isCached) badges.unshift('Siap');
      const label = cc.displayName || getLanguageLabel(code);
      options.push({
        code,
        label,
        displayLabel: `${label} · ${badges.join(' / ')}`,
        isCurated: false,
        isYouTubeCC: true,
        isCached,
        youtubeLanguageCode: cc.languageCode,
      });
    }

    return options;
  }

  saveSubtitleTrack(sourceLang = 'auto', targetLang = 'id', kind = 'translated', complete = true) {
    if (!this.lyricsData || this.lyricsData.length === 0) return null;
    const sl = sourceLang || 'auto';
    const tl = targetLang || 'id';
    const key = this._trackKey(sl, tl);
    const track = {
      key,
      sourceLang: sl,
      targetLang: tl,
      label: getLanguageLabel(tl),
      kind,
      complete,
      lines: this.lyricsData.map(line => line.translation || ''),
    };
    this.subtitleTracks.set(key, track);
    return track;
  }

  applySubtitleTrackToLyrics(sourceLang = 'auto', targetLang = 'id') {
    if (!this.lyricsData || this.lyricsData.length === 0) {
      return { hit: false, track: null };
    }
    const sl = sourceLang || 'auto';
    const tl = targetLang || 'id';

    let track = this.subtitleTracks.get(this._trackKey(sl, tl));
    if (!track && sl === 'auto' && this.detectedSourceLang) {
      track = this.subtitleTracks.get(this._trackKey(this.detectedSourceLang, tl));
    }

    if (track && Array.isArray(track.lines) && track.lines.length === this.lyricsData.length) {
      for (let i = 0; i < this.lyricsData.length; i++) {
        this.lyricsData[i].translation = track.lines[i] || '';
      }
      return { hit: Boolean(track.complete), track };
    }

    return { hit: false, track: null };
  }

  /**
   * Cleans YouTube video titles & channel names to isolate clean Artist & Track queries
   */
  cleanYouTubeTitle(rawTitle, rawAuthor = '') {
    if (!rawTitle) return { artist: rawAuthor || '', track: '', rawCleaned: '', versionTags: [] };

    const lowerRaw = rawTitle.toLowerCase();
    const versionTags = [];
    ['official video', 'official music video', 'music video', 'lyric video', 'lyrics', 'audio', 'live', 'acoustic', 'remix', 'cover', 'karaoke', 'instrumental', 'sped up', 'nightcore', 'slowed']
      .forEach(tag => {
        if (lowerRaw.includes(tag)) versionTags.push(tag);
      });

    let cleaned = rawTitle
      // Remove bracketed/parenthetical YouTube metadata tags
      .replace(/[\(\[](?:official\s*(?:music\s*)?video|official\s*(?:lyric\s*)?video|official\s*audio|official\s*visualizer|official|video\s*clip|music\s*video|lyric\s*video|lyrics?|audio|mv|m\/v|hd|4k|uhd|remaster(?:ed)?(?:\s*\d{4})?|visualizer|live(?:\s+at\s+[^\)\]]+)?|full\s*album|color\s*coded|performance\s*video|explicit|clean)[\)\]]/gi, '')
      // Remove pipe suffixes like "| Official Video" or "| Lirik Terjemahan"
      .replace(/\s*\|\s*(?:official|lyric|music|video|audio|lirik|terjemahan|sub\s*indo).*$/gi, '')
      // Remove trailing hashtags
      .replace(/#\S+/g, '')
      // Normalize dashes
      .replace(/[–—]/g, '-')
      .replace(/\s*-\s*(?:official\s*(?:music\s*)?video|lyrics?|official\s*audio|audio|mv)$/gi, '')
      // Remove extra spaces
      .replace(/\s{2,}/g, ' ')
      .trim();

    let artist = '';
    let track = cleaned;

    if (cleaned.includes(' - ')) {
      const parts = cleaned.split(' - ');
      artist = parts[0].trim();
      track = parts.slice(1).join(' - ').trim();
    } else if (cleaned.includes(': ')) {
      const parts = cleaned.split(': ');
      artist = parts[0].trim();
      track = parts.slice(1).join(': ').trim();
    } else if (rawAuthor) {
      artist = rawAuthor
        .replace(/\s*-\s*Topic$/i, '')
        .replace(/VEVO$/i, '')
        .replace(/\s*Official$/i, '')
        .trim();
    }

    // Strip featuring credits from track for cleaner exact LRCLIB lookup
    const trackNoFeat = track
      .replace(/[\(\[]?(?:feat\.?|ft\.?|featuring)\s+[^\)\]]+[\)\]]?/gi, '')
      .replace(/^["'「『]|["'」』]$/g, '')
      .trim();

    track = track.replace(/^["'「『]|["'」』]$/g, '').trim();
    artist = artist.replace(/^["'「『]|["'」』]$/g, '').trim();

    return {
      artist,
      track: trackNoFeat || track,
      fullTrack: track,
      rawCleaned: cleaned,
      versionTags,
    };
  }

  /**
   * Scores an LRCLIB result against the YouTube video's title, artist, and duration
   */
  scoreCandidate(item, targetTrack, targetArtist, youtubeDuration = 0, versionTags = []) {
    if (!item || (!item.syncedLyrics && !item.plainLyrics)) return -1000;

    let score = 0;
    const itemTrack = (item.trackName || item.name || '').toLowerCase();
    const itemArtist = (item.artistName || '').toLowerCase();
    const itemAlbum = (item.albumName || '').toLowerCase();
    const tTrack = (targetTrack || '').toLowerCase();
    const tArtist = (targetArtist || '').toLowerCase();

    // 1. Synced lyrics strongly preferred
    if (item.syncedLyrics && item.syncedLyrics.trim().length > 0) {
      score += 65;
    } else {
      score += 10;
    }

    // 2. Duration matching (critical so Official Music Video intros match!)
    if (youtubeDuration > 0 && item.duration > 0) {
      const diff = Math.abs(item.duration - youtubeDuration);
      if (diff <= 2) score += 85;
      else if (diff <= 5) score += 65;
      else if (diff <= 10) score += 40;
      else if (diff <= 18) score += 15;
      else if (diff <= 30) score -= 15;
      else score -= 60;
    }

    // 3. Title & Artist similarity
    if (tTrack) {
      if (itemTrack === tTrack) score += 45;
      else if (itemTrack.includes(tTrack) || tTrack.includes(itemTrack)) score += 25;
      else {
        const words = tTrack.split(/\s+/).filter(w => w.length > 2);
        const matches = words.filter(w => itemTrack.includes(w)).length;
        if (words.length > 0) score += Math.round((matches / words.length) * 25);
      }
    }

    if (tArtist) {
      if (itemArtist === tArtist) score += 35;
      else if (itemArtist.includes(tArtist) || tArtist.includes(itemArtist)) score += 20;
    }

    // 4. Penalize covers/karaoke/instrumental/nightcore unless YouTube video itself asks for them
    const riskyWords = ['karaoke', 'instrumental', 'cover', 'tribute', 'remix', 'nightcore', 'sped up', 'slowed', '8d', 'lofi', 'piano version'];
    const combinedItem = `${itemTrack} ${itemArtist} ${itemAlbum}`;
    const ytAllowsRisky = versionTags.some(t => riskyWords.includes(t));

    if (!ytAllowsRisky) {
      for (const word of riskyWords) {
        if (combinedItem.includes(word) && !tTrack.includes(word) && !tArtist.includes(word)) {
          score -= 75;
        }
      }
    }

    // 5. If YouTube video is Official Video and LRCLIB entry specifically notes Official Video
    if (versionTags.some(v => v.includes('video')) && itemTrack.includes('official video')) {
      score += 25;
    }

    // 6. Penalize instrumental flag
    if (item.instrumental) score -= 120;

    return score;
  }

  /**
   * Fetch synced/plain lyrics matching the YouTube video
   */
  async fetchLyrics(artist, track, duration = 0, options = {}) {
    this.isSynced = false;
    this.lyricsData = [];
    this.candidateLyrics = [];
    this.activeCandidateId = null;
    this.rawLyrics = null;
    this.sourceType = '';
    this.trackInfo = { title: track, artist, album: '', duration };

    const videoId = options.videoId || '';
    const versionTags = options.versionTags || [];
    const rawTitle = options.rawTitle || '';

    this.activeVideoId = videoId;
    this.clearSubtitleTracks();

    // 1. Check exact videoId preset first (100% verified match to that specific YouTube video)
    if (videoId && BUILT_IN_SYNCS[videoId]) {
      const preset = BUILT_IN_SYNCS[videoId];
      this.rawLyrics = preset.syncedLyrics;
      this.lyricsData = this.parseLRC(preset.syncedLyrics, preset.translations);
      this.isSynced = true;
      this.sourceType = 'preset';
      this.trackInfo = {
        title: preset.title,
        artist: preset.artist,
        album: '',
        duration: preset.duration || duration,
      };

      if (preset.translations && preset.translations.length > 0) {
        this.saveSubtitleTrack('auto', 'id', 'curated', true);
      }

      // Also populate background LRCLIB candidates silently or on demand
      this.fetchLrclibCandidates(artist, track, duration, versionTags, rawTitle).then(cands => {
        if (cands && cands.length > 0) {
          this.candidateLyrics = cands;
        }
      }).catch(() => {});

      return {
        success: true,
        isSynced: true,
        source: 'preset',
        trackInfo: this.trackInfo,
        lyrics: this.lyricsData,
        duration: this.trackInfo.duration,
        candidates: this.candidateLyrics,
      };
    }

    // 2. Query live LRCLIB candidates and rank by duration + text similarity
    const candidates = await this.fetchLrclibCandidates(artist, track, duration, versionTags, rawTitle);
    this.candidateLyrics = candidates;

    if (candidates.length > 0) {
      return this.applyCandidateData(candidates[0]);
    }

    return {
      success: false,
      isSynced: false,
      message: `Teks/lirik tidak ditemukan di LRCLIB untuk "${track}" ${artist ? 'oleh ' + artist : ''}.`,
      lyrics: [],
      candidates: [],
    };
  }

  /**
   * Queries LRCLIB across /get and /search endpoints and returns deduplicated, scored candidates
   */
  async fetchLrclibCandidates(artist, track, duration = 0, versionTags = [], rawTitle = '') {
    const map = new Map();
    const cleanTrack = (track || '').trim();
    const cleanArtist = (artist || '').trim();

    const addItem = (item) => {
      if (!item || !item.id) return;
      if (!item.syncedLyrics && !item.plainLyrics) return;
      if (!map.has(item.id)) {
        map.set(item.id, item);
      }
    };

    const requests = [];

    // Exact /api/get lookup (with duration if available)
    if (cleanTrack && cleanArtist) {
      let getUrl = `${this.LRCLIB_BASE_URL}/get?track_name=${encodeURIComponent(cleanTrack)}&artist_name=${encodeURIComponent(cleanArtist)}`;
      if (duration > 0) getUrl += `&duration=${Math.round(duration)}`;
      requests.push(
        fetch(getUrl).then(r => (r.ok ? r.json() : null)).then(addItem).catch(() => {})
      );
    }

    // Search query 1: artist + track
    const q1 = cleanArtist ? `${cleanArtist} ${cleanTrack}` : cleanTrack;
    if (q1.trim()) {
      requests.push(
        fetch(`${this.LRCLIB_BASE_URL}/search?q=${encodeURIComponent(q1.trim())}`)
          .then(r => (r.ok ? r.json() : []))
          .then(arr => Array.isArray(arr) && arr.forEach(addItem))
          .catch(() => {})
      );
    }

    // Search query 2: track only (in case YouTube channel name isn't the official artist name!)
    if (cleanTrack && cleanArtist) {
      requests.push(
        fetch(`${this.LRCLIB_BASE_URL}/search?q=${encodeURIComponent(cleanTrack)}`)
          .then(r => (r.ok ? r.json() : []))
          .then(arr => Array.isArray(arr) && arr.forEach(addItem))
          .catch(() => {})
      );
    }

    // Search query 3: raw cleaned title if different
    if (rawTitle && rawTitle.trim() && rawTitle.trim().toLowerCase() !== q1.trim().toLowerCase()) {
      const cleanedRaw = this.cleanYouTubeTitle(rawTitle).rawCleaned;
      if (cleanedRaw && cleanedRaw.toLowerCase() !== q1.trim().toLowerCase()) {
        requests.push(
          fetch(`${this.LRCLIB_BASE_URL}/search?q=${encodeURIComponent(cleanedRaw)}`)
            .then(r => (r.ok ? r.json() : []))
            .then(arr => Array.isArray(arr) && arr.forEach(addItem))
            .catch(() => {})
        );
      }
    }

    await Promise.all(requests);

    const items = Array.from(map.values()).map(item => ({
      ...item,
      _score: this.scoreCandidate(item, cleanTrack, cleanArtist, duration, versionTags),
    }));

    items.sort((a, b) => b._score - a._score);
    return items;
  }

  /**
   * Re-scores already-fetched candidates once exact YouTube duration becomes known
   */
  reselectByDuration(duration, track, artist, versionTags = []) {
    if (!this.candidateLyrics || this.candidateLyrics.length === 0 || !duration) return null;
    if (this.sourceType === 'preset' || this.sourceType === 'custom') return null;

    const rescored = [...this.candidateLyrics].map(item => ({
      ...item,
      _score: this.scoreCandidate(item, track, artist, duration, versionTags),
    }));
    rescored.sort((a, b) => b._score - a._score);
    this.candidateLyrics = rescored;

    const best = rescored[0];
    if (best && best.id !== this.activeCandidateId) {
      return this.applyCandidateData(best);
    }
    return null;
  }

  applyCandidateById(candidateId) {
    const found = this.candidateLyrics.find(c => String(c.id) === String(candidateId));
    if (!found) return null;
    return this.applyCandidateData(found);
  }

  applyCandidateData(data) {
    this.activeCandidateId = data.id || null;
    this.sourceType = 'lrclib';
    this.detectedSourceLang = '';
    this.subtitleTracks.clear();
    return this.processLrclibResponse(data);
  }

  processLrclibResponse(data) {
    this.trackInfo = {
      title: data.trackName || data.name || this.trackInfo.title,
      artist: data.artistName || this.trackInfo.artist,
      album: data.albumName || '',
      duration: data.duration || 0,
    };

    if (data.syncedLyrics && data.syncedLyrics.trim().length > 0) {
      this.rawLyrics = data.syncedLyrics;
      this.lyricsData = this.parseLRC(data.syncedLyrics);
      this.isSynced = this.lyricsData.length > 0;

      return {
        success: true,
        isSynced: this.isSynced,
        source: 'lrclib',
        trackInfo: this.trackInfo,
        lyrics: this.lyricsData,
        duration: this.trackInfo.duration,
        candidates: this.candidateLyrics,
      };
    }

    if (data.plainLyrics && data.plainLyrics.trim().length > 0) {
      this.rawLyrics = data.plainLyrics;
      this.lyricsData = this.parsePlainLyrics(data.plainLyrics, this.trackInfo.duration);
      this.isSynced = false;

      return {
        success: true,
        isSynced: false,
        source: 'lrclib',
        trackInfo: this.trackInfo,
        lyrics: this.lyricsData,
        duration: this.trackInfo.duration,
        candidates: this.candidateLyrics,
      };
    }

    return {
      success: false,
      isSynced: false,
      message: 'Format lirik tidak valid.',
      lyrics: [],
      candidates: this.candidateLyrics,
    };
  }

  /**
   * Sanitizes lyric/caption text so every character is cleanly typable on standard keyboards
   */
  sanitizeLyricText(text) {
    if (!text) return '';
    return text
      .replace(/[\u200B-\u200D\uFEFF]/g, '') // zero-width characters
      .replace(/[♪♫♬♩]/g, '') // musical note symbols
      .replace(/[‘’`´]/g, "'")
      .replace(/[“”]/g, '"')
      .replace(/[–—]/g, '-')
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * Parses LRC text with exact endTime boundaries (respecting empty instrumental markers!)
   */
  parseLRC(lrcText, optionalTranslations = []) {
    if (!lrcText || typeof lrcText !== 'string') return [];

    const lines = lrcText.split('\n');
    const rawEvents = [];
    const timeRegex = /\[(\d{1,3}):(\d{2})(?:\.(\d{1,3}))?\]/g;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      // Skip LRC metadata tags like [ar:...], [ti:...], [al:...], [length:...]
      if (/^\[(ar|ti|al|au|length|by|offset|re|ve):/i.test(line)) continue;

      let match;
      timeRegex.lastIndex = 0;
      const timestamps = [];

      while ((match = timeRegex.exec(line)) !== null) {
        const minutes = parseInt(match[1], 10);
        const seconds = parseInt(match[2], 10);
        const millisStr = (match[3] || '00').padEnd(3, '0').slice(0, 3);
        const millis = parseInt(millisStr, 10) / 1000;
        const totalSeconds = minutes * 60 + seconds + millis;
        timestamps.push(Math.round(totalSeconds * 100) / 100);
      }

      const rawText = line.replace(/\[\d{1,3}:\d{2}(?:\.\d{1,3})?\]/g, '').trim();
      const text = this.sanitizeLyricText(rawText);

      if (timestamps.length > 0) {
        timestamps.forEach(time => {
          rawEvents.push({ time, text });
        });
      }
    }

    rawEvents.sort((a, b) => a.time - b.time);

    const parsed = [];
    for (let i = 0; i < rawEvents.length; i++) {
      const evt = rawEvents[i];
      if (!evt.text) continue; // blank events serve as end boundary for the previous line!

      // Find the timestamp of the next event (either a blank marker or the next vocal line)
      let nextTime = null;
      for (let j = i + 1; j < rawEvents.length; j++) {
        if (rawEvents[j].time > evt.time) {
          nextTime = rawEvents[j].time;
          break;
        }
      }

      const endTime = nextTime !== null ? nextTime : evt.time + 6.0;

      const presetTrans = optionalTranslations[parsed.length] || '';
      parsed.push({
        id: `line_${parsed.length}`,
        time: evt.time,
        text: evt.text,
        endTime: Math.round(endTime * 100) / 100,
        presetTranslation: presetTrans,
        translation: presetTrans,
      });
    }

    return parsed;
  }

  /**
   * Parses custom pasted text in ANY format:
   * - LRC: [00:12.00] text
   * - SRT / VTT: 00:00:12,000 --> 00:00:15,500
   * - YouTube Transcript copy-paste ("0:12\ntext" or "0:12 text" or "1:02:15 text")
   * - Plain lyrics/text
   */
  parseCustomText(rawText, totalDuration = 0) {
    if (!rawText || typeof rawText !== 'string') return { lyrics: [], isSynced: false };
    const trimmed = rawText.trim();
    if (!trimmed) return { lyrics: [], isSynced: false };

    this.detectedSourceLang = '';
    this.subtitleTracks.clear();

    // 1. LRC format
    if (/\[\d{1,3}:\d{2}(?:\.\d{1,3})?\]/.test(trimmed)) {
      const parsed = this.parseLRC(trimmed);
      if (parsed.length > 0) {
        this.lyricsData = parsed;
        this.isSynced = true;
        this.sourceType = 'custom';
        return { lyrics: parsed, isSynced: true };
      }
    }

    // 2. SRT / VTT subtitle format
    if (/-->/.test(trimmed)) {
      const srtLines = this.parseSRT(trimmed);
      if (srtLines.length > 0) {
        this.lyricsData = srtLines;
        this.isSynced = true;
        this.sourceType = 'custom';
        return { lyrics: srtLines, isSynced: true };
      }
    }

    // 3. YouTube Transcript format (timestamps like 0:12 or 1:23:45)
    const ytLines = this.parseYouTubeTranscript(trimmed);
    if (ytLines.length > 0) {
      this.lyricsData = ytLines;
      this.isSynced = true;
      this.sourceType = 'custom';
      return { lyrics: ytLines, isSynced: true };
    }

    // 4. Plain text fallback
    const plain = this.parsePlainLyrics(trimmed, totalDuration);
    this.lyricsData = plain;
    this.isSynced = false;
    this.sourceType = 'custom';
    return { lyrics: plain, isSynced: false };
  }

  parseSRT(srtText) {
    const blocks = srtText.replace(/\r/g, '').split(/\n\n+/);
    const parsed = [];
    const timeRegex = /(?:(\d{1,2}):)?(\d{2}):(\d{2})[,.](\d{3})\s*-->\s*(?:(\d{1,2}):)?(\d{2}):(\d{2})[,.](\d{3})/;

    for (const block of blocks) {
      const lines = block.split('\n').map(l => l.trim()).filter(Boolean);
      const timeLineIdx = lines.findIndex(l => timeRegex.test(l));
      if (timeLineIdx === -1) continue;

      const m = lines[timeLineIdx].match(timeRegex);
      if (!m) continue;

      const startSec = (parseInt(m[1] || '0', 10) * 3600) + (parseInt(m[2], 10) * 60) + parseInt(m[3], 10) + (parseInt(m[4], 10) / 1000);
      const endSec = (parseInt(m[5] || '0', 10) * 3600) + (parseInt(m[6], 10) * 60) + parseInt(m[7], 10) + (parseInt(m[8], 10) / 1000);

      const captionText = this.sanitizeLyricText(
        lines.slice(timeLineIdx + 1).join(' ').replace(/<[^>]+>/g, '')
      );
      if (!captionText) continue;

      parsed.push({
        id: `srt_${parsed.length}`,
        time: Math.round(startSec * 100) / 100,
        text: captionText,
        endTime: Math.round(Math.max(startSec + 1.0, endSec) * 100) / 100,
        translation: '',
      });
    }

    return parsed;
  }

  parseYouTubeTranscript(text) {
    const lines = text.replace(/\r/g, '').split('\n').map(l => l.trim()).filter(Boolean);
    const parsed = [];
    const tsOnlyRegex = /^(?:(\d{1,2}):)?(\d{1,2}):(\d{2})$/;
    const tsInlineRegex = /^(?:(\d{1,2}):)?(\d{1,2}):(\d{2})\s+(.+)$/;

    const toSec = (h, m, s) => (parseInt(h || '0', 10) * 3600) + (parseInt(m, 10) * 60) + parseInt(s, 10);

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const mInline = line.match(tsInlineRegex);
      if (mInline) {
        const time = toSec(mInline[1], mInline[2], mInline[3]);
        const txt = this.sanitizeLyricText(mInline[4]);
        if (txt) {
          parsed.push({ id: `yt_${parsed.length}`, time, text: txt, endTime: 0, translation: '' });
        }
        continue;
      }

      const mOnly = line.match(tsOnlyRegex);
      if (mOnly) {
        const time = toSec(mOnly[1], mOnly[2], mOnly[3]);
        // Collect following text lines until next timestamp
        const chunk = [];
        let j = i + 1;
        while (j < lines.length && !tsOnlyRegex.test(lines[j]) && !tsInlineRegex.test(lines[j])) {
          chunk.push(lines[j]);
          j++;
        }
        i = j - 1;
        const txt = this.sanitizeLyricText(chunk.join(' '));
        if (txt) {
          parsed.push({ id: `yt_${parsed.length}`, time, text: txt, endTime: 0, translation: '' });
        }
      }
    }

    for (let i = 0; i < parsed.length; i++) {
      parsed[i].endTime = i < parsed.length - 1 ? parsed[i + 1].time : parsed[i].time + 5.0;
    }

    return parsed;
  }

  parsePlainLyrics(plainText, totalDuration = 0) {
    if (!plainText || typeof plainText !== 'string') return [];

    const lines = plainText
      .split('\n')
      .map(l => this.sanitizeLyricText(l))
      .filter(l => l.length > 0 && !l.startsWith('[') && !l.endsWith(']'));

    const step = totalDuration > 10 && lines.length > 0
      ? Math.max(2.5, Math.min(6.0, (totalDuration - 8) / lines.length))
      : 4.5;

    return lines.map((text, idx) => ({
      id: `plain_${idx}`,
      time: Math.round(idx * step * 100) / 100,
      text: text,
      endTime: Math.round((idx + 1) * step * 100) / 100,
      translation: '',
    }));
  }

  getActiveLineIndex(currentTime, offsetSeconds = 0) {
    if (!this.lyricsData || this.lyricsData.length === 0) return 0;
    const effectiveTime = Math.max(0, currentTime - offsetSeconds);

    if (effectiveTime < this.lyricsData[0].time) return 0;

    let activeIdx = 0;
    for (let i = 0; i < this.lyricsData.length; i++) {
      if (effectiveTime >= this.lyricsData[i].time) {
        activeIdx = i;
      } else {
        break;
      }
    }
    return activeIdx;
  }

  _cacheKey(sourceLang, targetLang, text) {
    return `${sourceLang || 'auto'}|${targetLang || 'id'}|${text}`;
  }

  _getCachedTranslation(sourceLang, targetLang, text) {
    const key = this._cacheKey(sourceLang, targetLang, text);
    if (this.translationCache.has(key)) {
      return this.translationCache.get(key);
    }
    try {
      const stored = sessionStorage.getItem(`madtype_tr_${key}`);
      if (stored) {
        this.translationCache.set(key, stored);
        return stored;
      }
    } catch (e) {}
    return null;
  }

  _setCachedTranslation(sourceLang, targetLang, text, translated) {
    const key = this._cacheKey(sourceLang, targetLang, text);
    this.translationCache.set(key, translated);
    try {
      sessionStorage.setItem(`madtype_tr_${key}`, translated);
    } catch (e) {}
  }

  async _fetchGoogleTranslate(text, sourceLang = 'auto', targetLang = 'id') {
    const sl = encodeURIComponent(sourceLang || 'auto');
    const tl = encodeURIComponent(targetLang || 'id');
    const q = encodeURIComponent(text);
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${sl}&tl=${tl}&dt=t&q=${q}`;

    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(`Translate HTTP ${res.status}`);
    }
    const data = await res.json();
    const translated = Array.isArray(data?.[0])
      ? data[0].map(seg => (Array.isArray(seg) ? seg[0] || '' : '')).join('')
      : '';
    const detected = typeof data?.[2] === 'string' ? data[2] : '';
    return { translated, detected };
  }

  async _fetchMyMemoryTranslate(text, sourceLang = 'en', targetLang = 'id') {
    const sl = sourceLang && sourceLang !== 'auto' ? sourceLang : 'en';
    if (sl === targetLang) return { translated: text, detected: sl };
    const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=${encodeURIComponent(sl)}|${encodeURIComponent(targetLang)}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`MyMemory HTTP ${res.status}`);
    const data = await res.json();
    const translated = data?.responseData?.translatedText;
    if (translated && typeof translated === 'string') {
      return { translated, detected: sl };
    }
    throw new Error('MyMemory invalid response');
  }

  async _translateSingleLine(text, sourceLang, targetLang) {
    try {
      const { translated, detected } = await this._fetchGoogleTranslate(text, sourceLang, targetLang);
      if (translated) return { translated: translated.trim(), detected };
    } catch (err) {}

    try {
      const fallback = await this._fetchMyMemoryTranslate(text, sourceLang, targetLang);
      if (fallback.translated) return { translated: fallback.translated.trim(), detected: fallback.detected };
    } catch (err) {}

    return { translated: '', detected: '' };
  }

  /**
   * Translates all active lyric lines into targetLang, prioritizing the current line batch first.
   */
  async translateCurrentLyrics(sourceLang = 'auto', targetLang = 'id', options = {}) {
    const runId = ++this._translationRunId;
    const priorityIndex = Number.isInteger(options.priorityIndex) ? options.priorityIndex : 0;
    const onBatchComplete = typeof options.onBatchComplete === 'function' ? options.onBatchComplete : () => {};

    if (!this.lyricsData || this.lyricsData.length === 0) {
      return { success: false, cancelled: false };
    }

    const sl = sourceLang || 'auto';
    const tl = targetLang || 'id';

    // Check if full structured subtitle track is already cached for this song & language pair
    const appliedTrack = this.applySubtitleTrackToLyrics(sl, tl);
    if (appliedTrack.hit) {
      onBatchComplete({ detectedLang: this.detectedSourceLang, progress: 1 });
      return { success: true, detectedLang: this.detectedSourceLang, fromTrackCache: true };
    }

    // If explicit source & target language match, display clean source lyric meaning directly
    if (sl !== 'auto' && sl === tl) {
      this.detectedSourceLang = sl;
      this.lyricsData.forEach(line => {
        line.translation = line.text;
      });
      this.saveSubtitleTrack(sl, tl, 'original', true);
      onBatchComplete({ detectedLang: sl, progress: 1 });
      return { success: true, detectedLang: sl };
    }

    // Track lines needing network translation vs instant cache/preset hits
    const pendingIndices = [];
    const useCuratedIndonesianPreset =
      tl === 'id' && (sl === 'auto' || sl === 'tl' || sl === 'en');

    for (let i = 0; i < this.lyricsData.length; i++) {
      const line = this.lyricsData[i];
      if (!line.text) {
        line.translation = '';
        continue;
      }

      if (useCuratedIndonesianPreset && line.presetTranslation) {
        line.translation = line.presetTranslation;
        continue;
      }

      const cached = this._getCachedTranslation(sl, tl, line.text);
      if (cached !== null) {
        line.translation = cached;
      } else {
        line.translation = '';
        pendingIndices.push(i);
      }
    }

    if (pendingIndices.length === 0) {
      this.saveSubtitleTrack(sl, tl, useCuratedIndonesianPreset ? 'curated' : 'cached', true);
    }

    // Notify immediately with any cached/preset lines ready
    onBatchComplete({ detectedLang: this.detectedSourceLang, progress: pendingIndices.length === 0 ? 1 : 0 });

    if (pendingIndices.length === 0) {
      return { success: true, detectedLang: this.detectedSourceLang };
    }

    // Deduplicate identical lyric lines (e.g. choruses) while keeping priority line first
    const uniqueTextOrder = [];
    const textToIndices = new Map();

    // Sort indices so priorityIndex (and nearby lines) go first
    const orderedIndices = [...pendingIndices].sort((a, b) => {
      const da = a >= priorityIndex ? a - priorityIndex : pendingIndices.length + a;
      const db = b >= priorityIndex ? b - priorityIndex : pendingIndices.length + b;
      return da - db;
    });

    for (const idx of orderedIndices) {
      const txt = this.lyricsData[idx].text;
      if (!textToIndices.has(txt)) {
        textToIndices.set(txt, []);
        uniqueTextOrder.push(txt);
      }
      textToIndices.get(txt).push(idx);
    }

    // Group unique lines into URL-safe batches (~1000 chars encoded max per batch, max 16 lines)
    const batches = [];
    let currentBatch = [];
    let currentLen = 0;
    for (const txt of uniqueTextOrder) {
      const estLen = encodeURIComponent(txt).length + 3;
      if (currentBatch.length > 0 && (currentBatch.length >= 16 || currentLen + estLen > 1100)) {
        batches.push(currentBatch);
        currentBatch = [];
        currentLen = 0;
      }
      currentBatch.push(txt);
      currentLen += estLen;
    }
    if (currentBatch.length > 0) batches.push(currentBatch);

    let detectedLang = '';
    for (let bIdx = 0; bIdx < batches.length; bIdx++) {
      if (this._translationRunId !== runId) {
        return { success: false, cancelled: true };
      }

      const batch = batches[bIdx];
      let resolvedPairs = null;

      try {
        const joined = batch.join('\n');
        const { translated, detected } = await this._fetchGoogleTranslate(joined, sl, tl);
        if (detected && !detectedLang) {
          detectedLang = detected;
          this.detectedSourceLang = detected;
        }
        const splitLines = translated ? translated.split('\n').map(s => s.trim()) : [];
        if (splitLines.length === batch.length && splitLines.every(Boolean)) {
          resolvedPairs = batch.map((src, idx) => ({ src, dst: splitLines[idx] }));
        }
      } catch (err) {}

      if (this._translationRunId !== runId) {
        return { success: false, cancelled: true };
      }

      // Fallback to bounded parallel single-line translation if newline count mismatched or batch failed
      if (!resolvedPairs) {
        resolvedPairs = [];
        const concurrency = 4;
        for (let k = 0; k < batch.length; k += concurrency) {
          if (this._translationRunId !== runId) {
            return { success: false, cancelled: true };
          }
          const slice = batch.slice(k, k + concurrency);
          const results = await Promise.all(
            slice.map(async (src) => {
              const r = await this._translateSingleLine(src, sl, tl);
              if (r.detected && !detectedLang) {
                detectedLang = r.detected;
                this.detectedSourceLang = r.detected;
              }
              return { src, dst: r.translated };
            })
          );
          resolvedPairs.push(...results);
        }
      }

      if (this._translationRunId !== runId) {
        return { success: false, cancelled: true };
      }

      // Apply translated text to all matching lyric lines & cache
      for (const { src, dst } of resolvedPairs) {
        if (!dst) continue;
        this._setCachedTranslation(sl, tl, src, dst);
        const indices = textToIndices.get(src) || [];
        indices.forEach(lineIdx => {
          if (this.lyricsData[lineIdx]) {
            this.lyricsData[lineIdx].translation = dst;
          }
        });
      }

      onBatchComplete({
        detectedLang: detectedLang || this.detectedSourceLang,
        progress: (bIdx + 1) / batches.length,
      });
    }

    this.saveSubtitleTrack(sl, tl, 'translated', true);

    return {
      success: true,
      detectedLang: detectedLang || this.detectedSourceLang,
    };
  }
}

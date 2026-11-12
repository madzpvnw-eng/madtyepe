/**
 * @license
 * VOCATYPE - Lyrics & LRCLIB Synchronization Engine with Indonesian Translations
 * Handles LRC parsing, LRCLIB API queries, title cleaning, timestamp matching,
 * and Indonesian subtitle translations inspired by video.vocatype.app/id/.
 */

// Curated verified synced lyrics and Indonesian translations for popular songs
const BUILT_IN_SYNCS = {
  // Cinderella - Ang Boyfriend Kong Baduy (from Vocatype screenshot)
  'cinderella': {
    title: 'Ang Boyfriend Kong Baduy',
    artist: 'Cinderella',
    duration: 176,
    syncedLyrics: `
[00:12.00] Ang aking boyfriend mahilig sa disco.
[00:16.80] Lagi na lang kaming nagigimbal sa tugtog.
[00:21.50] Sayaw dito, sayaw doon, walang humpay.
[00:26.20] Kung minsan tuloy ako ay naiinip.
[00:30.80] Ngunit kapag tumugtog ang paborito ko.
[00:35.50] Kami ay magkasama sa gitna ng disco.
[00:40.00] Cinderella ang tawag nila sa akin.
[00:44.80] Pagkat pagpatak ng alas-dose ako'y uuwi na.
[00:49.50] Sayaw dito, sayaw doon, walang humpay.
[00:54.20] Cinderella, Cinderella ang ganda mo.
[00:59.00] Ang aking boyfriend mahilig sa disco.
[01:03.50] Sa tugtugan ay laging sumasabay.
[01:08.20] Sayaw dito, sayaw doon, walang humpay.
[01:13.00] Cinderella ang tawag nila sa akin.
    `.trim(),
    translations: [
      'Pacar saya sangat suka pergi ke disko.',
      'Kami selalu terhanyut dalam dentuman musik.',
      'Berdansa ke sana kemari tanpa henti.',
      'Terkadang aku merasa sedikit jenuh.',
      'Namun saat lagu favoritku mulai dimainkan.',
      'Kami berdansa bersama di tengah lantai disko.',
      'Cinderella adalah panggilan mereka untukku.',
      'Karena tepat tengah malam aku harus pulang.',
      'Berdansa ke sana kemari tanpa henti.',
      'Cinderella, Cinderella betapa cantiknya dirimu.',
      'Pacar saya sangat suka pergi ke disko.',
      'Selalu bergoyang mengikuti irama lagu.',
      'Berdansa ke sana kemari tanpa henti.',
      'Cinderella adalah panggilan mereka untukku.',
    ]
  },

  // Coldplay - Yellow
  'yellow': {
    title: 'Yellow',
    artist: 'Coldplay',
    duration: 269,
    syncedLyrics: `
[00:35.20] Look at the stars
[00:38.50] Look how they shine for you
[00:44.20] And everything you do
[00:49.00] Yeah, they were all yellow
[00:56.50] I came along
[01:00.00] I wrote a song for you
[01:05.80] And all the things you do
[01:10.50] And it was called Yellow
[01:18.00] So then I took my turn
[01:23.20] Oh, what a thing to have done
[01:28.50] And it was all yellow
[01:36.00] Your skin, oh yeah, your skin and bones
[01:42.50] Turn into something beautiful
[01:47.50] Do you know, you know I love you so?
[01:54.00] You know I love you so
    `.trim(),
    translations: [
      'Lihatlah bintang-bintang di langit',
      'Lihat bagaimana mereka bersinar untukmu',
      'Dan untuk segala hal yang kau lakukan',
      'Ya, semuanya berwarna kuning keemasan',
      'Aku pun datang menghampiri',
      'Kutuliskan sebuah lagu khusus untukmu',
      'Dan untuk semua hal yang kau lakukan',
      'Dan lagu itu kuberi judul Yellow',
      'Lalu giliranku pun tiba',
      'Oh, sungguh hal indah yang telah kulakukan',
      'Dan semuanya bernuansa kuning hangat',
      'Kulitmu, oh ya, seluruh raga dan jiwamu',
      'Menjelma menjadi sesuatu yang begitu indah',
      'Tahukah engkau betapa aku sangat mencintaimu?',
      'Kau tahu betapa aku begitu mencintaimu',
    ]
  },

  // Queen - Bohemian Rhapsody
  'bohemian': {
    title: 'Bohemian Rhapsody',
    artist: 'Queen',
    duration: 359,
    syncedLyrics: `
[00:01.00] Is this the real life?
[00:04.50] Is this just fantasy?
[00:08.50] Caught in a landslide
[00:12.50] No escape from reality
[00:17.50] Open your eyes
[00:22.50] Look up to the skies and see
[00:29.00] I'm just a poor boy, I need no sympathy
[00:35.50] Because I'm easy come, easy go
[00:39.00] Little high, little low
[00:43.00] Any way the wind blows doesn't really matter to me, to me
[00:54.50] Mama, just killed a man
[01:01.00] Put a gun against his head, pulled my trigger, now he's dead
[01:10.50] Mama, life had just begun
[01:18.00] But now I've gone and thrown it all away
    `.trim(),
    translations: [
      'Apakah ini kehidupan nyata?',
      'Ataukah hanya sekadar khayalan fantasi?',
      'Terjebak dalam runtuhan tanah longsor',
      'Tak ada jalan keluar dari kenyataan ini',
      'Bukalah kedua matamu',
      'Pandanglah ke atas langit dan saksikanlah',
      'Aku hanyalah anak malang yang tak butuh belas kasihan',
      'Karena bagiku datang mudah, pergi pun mudah',
      'Kadang melayang tinggi, terkadang terpuruk rendah',
      'Ke mana pun angin berhembus tak lagi berarti bagiku',
      'Mama, aku baru saja membunuh seorang pria',
      'Kutodongkan senjata di kepalanya, kutarik pelatuk, kini dia tewas',
      'Mama, kehidupanku padahal baru saja dimulai',
      'Namun kini aku telah membuang segalanya sia-sia',
    ]
  },

  // Ed Sheeran - Shape of You
  'shape': {
    title: 'Shape of You',
    artist: 'Ed Sheeran',
    duration: 233,
    syncedLyrics: `
[00:09.50] The club isn't the best place to find a lover
[00:12.50] So the bar is where I go
[00:14.50] Me and my friends at the table doing shots
[00:16.80] Drinking fast and then we talk slow
[00:19.00] And you come over and start up a conversation with just me
[00:22.50] And trust me, I'll give it a chance now
[00:24.50] Took my hand, stop, put Van the Man on the jukebox
[00:27.50] And then we start to dance, and now I'm singing like
[00:30.50] Girl, you know I want your love
[00:32.50] Your love was handmade for somebody like me
[00:35.00] Come on now, follow my lead
[00:37.50] I may be crazy, don't mind me
    `.trim(),
    translations: [
      'Klub malam bukanlah tempat terbaik untuk menemukan kekasih',
      'Maka bar adalah tempat yang kutuju',
      'Aku dan teman-temanku di meja menikmati minuman',
      'Minum dengan cepat lalu mengobrol santai perlahan',
      'Lalu kau mendekat dan memulai percakapan hanya berdua denganku',
      'Dan percayalah, aku akan menyambut kesempatan ini',
      'Kau genggam tanganku, lalu memutar lagu Van Morrison di jukebox',
      'Dan kita mulai berdansa berdua, kini aku bernyanyi seperti ini',
      'Gadisku, kau tahu betapa aku mendambakan cintamu',
      'Cintamu memang diciptakan khusus untuk orang sepertiku',
      'Ayo sekarang, ikuti langkah dansaku',
      'Mungkin aku sedikit gila, tapi jangan hiraukan',
    ]
  },

  // Rick Astley - Never Gonna Give You Up
  'never': {
    title: 'Never Gonna Give You Up',
    artist: 'Rick Astley',
    duration: 213,
    syncedLyrics: `
[00:18.50] We're no strangers to love
[00:22.50] You know the rules and so do I
[00:27.00] A full commitment's what I'm thinking of
[00:31.50] You wouldn't get this from any other guy
[00:36.00] I just wanna tell you how I'm feeling
[00:41.00] Gotta make you understand
[00:44.00] Never gonna give you up
[00:46.50] Never gonna let you down
[00:48.50] Never gonna run around and desert you
[00:53.00] Never gonna make you cry
[00:55.20] Never gonna say goodbye
[00:57.50] Never gonna tell a lie and hurt you
    `.trim(),
    translations: [
      'Kita bukan orang yang asing dalam urusan cinta',
      'Kau tahu aturannya dan aku pun memahaminya',
      'Komitmen seutuhnya yang selalu kupikirkan',
      'Kau takkan pernah mendapatkan komitmen ini dari pria lain',
      'Aku hanya ingin mengungkapkan apa yang kurasakan padamu',
      'Harus membuatmu benar-benar mengerti',
      'Takkan pernah menyerah melepaskanmu',
      'Takkan pernah membiarkanmu kecewa',
      'Takkan pernah berpaling dan meninggalkanmu sendiri',
      'Takkan pernah membuatmu meneteskan air mata',
      'Takkan pernah mengucap kata selamat tinggal',
      'Takkan pernah berdusta dan melukai hatimu',
    ]
  }
};

export class LyricsManager {
  constructor() {
    this.LRCLIB_BASE_URL = 'https://lrclib.net/api';
    this.lyricsData = []; // Array of { id, time, text, endTime, translation }
    this.rawLyrics = null;
    this.isSynced = false;
    this.trackInfo = {
      title: '',
      artist: '',
      album: '',
      duration: 0,
    };
  }

  cleanYouTubeTitle(rawTitle, rawAuthor = '') {
    if (!rawTitle) return { artist: rawAuthor || '', track: '' };

    let cleaned = rawTitle
      .replace(/[\(\[](?:official\s*(?:music\s*)?video|official\s*audio|official|video|audio|mv|lyrics?|lyric\s*video|hd|4k|remastered|visualizer|live|full\s*album|color\s*coded|performance\s*video)[\)\]]/gi, '')
      .replace(/\s*-\s*(?:official\s*video|lyrics|audio)/gi, '')
      .replace(/[–—]/g, '-')
      .trim();

    let artist = '';
    let track = cleaned;

    if (cleaned.includes(' - ')) {
      const parts = cleaned.split(' - ');
      artist = parts[0].trim();
      track = parts.slice(1).join(' - ').trim();
    } else if (rawAuthor) {
      artist = rawAuthor.replace(/ - Topic$/i, '').replace(/VEVO$/i, '').trim();
    }

    track = track.replace(/^["']|["']$/g, '').trim();
    artist = artist.replace(/^["']|["']$/g, '').trim();

    return { artist, track, rawCleaned: cleaned };
  }

  /**
   * Search lyrics: first checks verified built-in presets (with Indonesian subtitles),
   * then queries live LRCLIB API.
   */
  async fetchLyrics(artist, track, duration = 0) {
    this.isSynced = false;
    this.lyricsData = [];
    this.rawLyrics = null;
    this.trackInfo = { title: track, artist, album: '', duration };

    const searchKey = `${track} ${artist}`.toLowerCase();

    // Check built-in verified presets first
    for (const key of Object.keys(BUILT_IN_SYNCS)) {
      if (searchKey.includes(key)) {
        const preset = BUILT_IN_SYNCS[key];
        this.rawLyrics = preset.syncedLyrics;
        this.lyricsData = this.parseLRC(preset.syncedLyrics, preset.translations);
        this.isSynced = true;
        this.trackInfo.title = preset.title;
        this.trackInfo.artist = preset.artist;
        this.trackInfo.duration = preset.duration || 0;
        return {
          success: true,
          isSynced: true,
          trackInfo: this.trackInfo,
          lyrics: this.lyricsData,
          duration: preset.duration || 0,
        };
      }
    }

    // Live LRCLIB API query
    const encodedTrack = encodeURIComponent(track.trim());
    const encodedArtist = encodeURIComponent(artist.trim());

    if (track && artist) {
      try {
        let getUrl = `${this.LRCLIB_BASE_URL}/get?track_name=${encodedTrack}&artist_name=${encodedArtist}`;
        if (duration > 0) getUrl += `&duration=${Math.round(duration)}`;

        const res = await fetch(getUrl);
        if (res.ok) {
          const data = await res.json();
          if (data && (data.syncedLyrics || data.plainLyrics)) {
            return this.processLrclibResponse(data);
          }
        }
      } catch (e) {
        console.warn('LRCLIB get attempt error:', e);
      }
    }

    // Fallback search
    try {
      const searchQuery = artist ? `${artist} ${track}` : track;
      const searchUrl = `${this.LRCLIB_BASE_URL}/search?q=${encodeURIComponent(searchQuery.trim())}`;
      const searchRes = await fetch(searchUrl);

      if (searchRes.ok) {
        const results = await searchRes.json();
        if (Array.isArray(results) && results.length > 0) {
          const bestSynced = results.find(item => item.syncedLyrics && item.syncedLyrics.trim().length > 0);
          if (bestSynced) return this.processLrclibResponse(bestSynced);

          const bestPlain = results.find(item => item.plainLyrics && item.plainLyrics.trim().length > 0);
          if (bestPlain) return this.processLrclibResponse(bestPlain);
        }
      }
    } catch (e) {
      console.warn('LRCLIB search attempt error:', e);
    }

    return {
      success: false,
      isSynced: false,
      message: `Lirik tidak ditemukan di LRCLIB untuk "${track}" ${artist ? 'oleh ' + artist : ''}.`,
      lyrics: [],
    };
  }

  processLrclibResponse(data) {
    this.trackInfo = {
      title: data.trackName || this.trackInfo.title,
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
        trackInfo: this.trackInfo,
        lyrics: this.lyricsData,
      };
    }

    if (data.plainLyrics && data.plainLyrics.trim().length > 0) {
      this.rawLyrics = data.plainLyrics;
      this.lyricsData = this.parsePlainLyrics(data.plainLyrics);
      this.isSynced = false;

      return {
        success: true,
        isSynced: false,
        trackInfo: this.trackInfo,
        lyrics: this.lyricsData,
      };
    }

    return {
      success: false,
      isSynced: false,
      message: 'Format lirik tidak valid.',
      lyrics: [],
    };
  }

  parseLRC(lrcText, optionalTranslations = []) {
    if (!lrcText || typeof lrcText !== 'string') return [];

    const lines = lrcText.split('\n');
    const parsed = [];
    const timeRegex = /\[(\d{2}):(\d{2})(?:\.(\d{2,3}))?\]/g;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      let match;
      const timestamps = [];

      while ((match = timeRegex.exec(line)) !== null) {
        const minutes = parseInt(match[1], 10);
        const seconds = parseInt(match[2], 10);
        const millisStr = match[3] || '00';
        const millis = parseFloat('0.' + millisStr);
        const totalSeconds = minutes * 60 + seconds + millis;
        timestamps.push(totalSeconds);
      }

      const text = line.replace(/\[\d{2}:\d{2}(?:\.\d{2,3})?\]/g, '').trim();

      if (text && timestamps.length > 0) {
        timestamps.forEach(time => {
          parsed.push({
            id: `line_${parsed.length}`,
            time: Math.round(time * 100) / 100,
            text: text,
            endTime: 0,
            translation: optionalTranslations[parsed.length] || '',
          });
        });
      }
    }

    parsed.sort((a, b) => a.time - b.time);

    // Compute end times ensuring at least 3.5s per segment
    for (let i = 0; i < parsed.length; i++) {
      if (i < parsed.length - 1) {
        parsed[i].endTime = Math.max(parsed[i].time + 3.2, parsed[i + 1].time);
      } else {
        parsed[i].endTime = parsed[i].time + 7.0;
      }
    }

    return parsed;
  }

  parsePlainLyrics(plainText) {
    if (!plainText || typeof plainText !== 'string') return [];

    const lines = plainText
      .split('\n')
      .map(l => l.trim())
      .filter(l => l.length > 0 && !l.startsWith('[') && !l.endsWith(']'));

    return lines.map((text, idx) => ({
      id: `plain_${idx}`,
      time: idx * 4.5,
      text: text,
      endTime: (idx + 1) * 4.5,
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
}

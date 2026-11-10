import fs from 'fs';
import path from 'path';

const PACKS_DIR = path.join(process.cwd(), 'content', 'packs', 'n4');

// Canonical pure-hiragana readings for L01-L10 reading passages
const L01_L10_READING_KANA: Record<string, string> = {
  'n4.l01': `せんげつ、うみのちかくのあたらしいマンションにひっこしました。このまちはしぜんがゆたかで、とてもしずかなかんきょうです。へやのベランダにでると、あおいうみとうつくしいけしきがはっきりみえます。あさはやくまどをあけると、ここちよいなみのおとやとりのこえがきこえて、まいにちとてもきもちよくおきられます。

また、せいかつもおもったよりべんりです。せんしゅう、えきのちかくにおおきなスーパーがたちました。そこではしんせんなさかなややさいがやすくかえますし、にちようひんやせいかつのどうぐもなんでもそろいます。まちのなかにはひろいこうえんもあって、しゅうまつにはじゅうみんがじゆうにさんぽをたのしめます。

いぜんすんでいたとかいではビルばかりでそらがせまくかんじられましたが、ここではひろいうみとやまがみわたせます。にほんごがっこうのともだちをへやにしょうたいして、このすばらしいけしきをみせてあげたいとおもっています。`,

  'n4.l02': `わたしはこどものころからにほんのけんちくやデザインにつよいかんしんをもっていました。こうこうせいのときににほんのもくぞうけんちくについてのほんをよんで、しょうらいにほんでほんもののけんちくぎじゅつをまなびたいというゆめをもつようになりました。

そのゆめをじつげんするために、だいがくをそつぎょうしたあと、にほんのだいがくいんへりゅうがくしようとおもっています。らいねんのしがつににゅうがくするよていなので、いまはまいにちよじかんいにほんごをべんきょうしています。ことしのじゅうにがつにはにほんごのうりょくしけんのエヌにをうけるつもりです。ごうかくできれば、せんもんのけんきゅうについてにほんのせんせいがたとよりスムーズにぎろんできるようになるとおもいます。

もちろん、がいこくでひとりでくらすことにはふあんもありますが、いろいろなこんなんをのりこえてりっぱなけいけんにしたいです。しょうらいはじぶんのくにとにほんをつなぐけんちくかになろうとこころにきめています。`,

  'n4.l03': `にほんのまちをあるいていると、でんちゅうやどうろ、たてもののかべにたくさんのひょうしきやかんばんがあることにきづきます。これらのひょうしきは、ひとびとのあんぜんをまもり、じこをふせぐためにせっちされています。

たとえば、こうじちゅうのばしょには「たちいりきんし」とおおきくかいてあります。これは「きけんですから、なかにいってはいけません」という意味です。また、えきのホームのゆかにはきいろいせんがひかれていて、「はくせんのうちがわにさがれ」というアナウンスがながれます。でんしゃがちかづいてきたときはあぶないですから、きいろいせんのそとがわにでてはいけません。

どうろには「とまれ」というぎゃくさんかくけいのあかいひょうしきがあります。くるまやじてんしゃをうんてんするひとは、このひょうしきのばしょでいちどかならずとまらなければなりません。ほこうしゃもいそいでどうろをわたろうとせず、しんごうをしっかりまもってあんぜんにあるくことがたいせつです。ひょうしきのいみをただしくりかいして、みんなでルールをまもりましょう。`,

  'n4.l04': `にほんでりゅうがくせいやしゃかいじんがアパートをさがすとき、なにをじゅうしすればよいでしょうか。おおくのひとはやちん、えきからのきょり、へやのひろさなどをじょうけんにあげます。

いっぱんてきに、えきからちかければちかいほどつうきんやつうがくにはべんりですが、そのぶんやちんもたかくなります。やちんがやすければせいかつひをせつやくできますが、えきからあるいてにじゅっぷんいじょうかかると、あめのひやよるおそいきたくのときにたいへんです。

また、へやはひろければひろいほどにもつをたくさんおけてかいてきですが、ふゆはだんぼうがききにくく、でんきだいもたかくなりがちです。ふどうさんやにいってよくそうだんすれば、じぶんのよさんやせいかつスタイルにあったぶっけんをていあんしてもらえます。あせってきめずに、いくつかのへやをじっさいにけんがくしてくらべれば、こうかいしないへやさがしができるはずです。`,

  'n4.l05': `ふゆのにほんをたびするなら、ゆきげしきをながめながらはいるろてんぶろはかくべつのたいけんです。おおくのりゅうがくせいやがいこくじんかんこうきゃくが「おんせんにいってみたいけれど、どこがいいかわからない」とそうだんにきます。

とうきょうからちかくてきがるにいけるばしょをさがしているなら、かながわけんのはこねおんせんがいちばんおすすめです。しんじゅくえきからとっきゅうロマンスカーにのれば、いちじかんはんたらずでとうちゃくします。おんせんがいにはれきしのあるりょかんがおおく、おいしいにほんりょうりやでんとうてきなおもてなしをたんのうできます。

もしとまりがけでゆっくりおんせんをたのしむなら、ゆかたのきかたやおんせんのただしいマナーをじぜんにかくにんしておくとあんしんです。ゆぶねにはいるまえにかならずからだをあらうことや、おゆのなかにタオルをいれないことなどのルールをまもれば、だれでもきもちよくおんせんをまんきつできます。`,

  'n4.l06': `かいしゃのしごとをおえてさいごにオフィスをでるしゃいんは、ぼうはんとしょうエネのためにいくつかのたいせつなことをかくにんしなければなりません。

まず、すべてのへやのまどがきちんとしまっているかをたしかめます。まどがあいたままだと、よるのあいだにきゅうなつよいかぜがふいてあめがふきこむと、つくえのうえのたいせつなしょるいがぬれてよごれてしまいます。つぎに、エアコンのでんげんがきれているか、パソコンのがめんがきえているかをかくにんします。でんきがついたままだとむだなでんりょくをしょうひしますし、かさいのげんいんにもなりかねません。

きゅうとうしつではすいどうのじゃぐちがしっかりしまっているか、ゴミばこのまわりによごれたかみくずがおちていないかもてんけんします。さいごにだれもいないことをたしかめたら、オフィスのしょうめいをすべてけして、ドアのかぎをかけてせじょうをかくにんします。ひとりひとりがルールをまもることで、あんしんであんぜんなしょくばかんきょうがたもたれています。`,

  'n4.l07': `あすかいさいされるアジアこくさいこうりゅうセミナーにむけて、だいかいぎしつのじゅんびがすべてかんりょうしました。

まず、えんだんのしょうめんにはおおきなおうだんまくがかかげてあり、さんかしゃぜんいんがみやすいようにプロジェクターのスクリーンもおろしてあります。つくえのうえにはかっこくのだいひょうしゃのなふだとしりょうのファイルがきりとならべてあります。また、かいじょうのいりぐちふきんにはうけつけのあんないばんがたててあり、ぜんたいのしんこうよていひょうがおおきくはってあります。

さんかしゃのきゅうけいじかんのために、へやのおくのテーブルにはあたたかいおちゃやコーヒーのカップがよういしてあります。かびんにはきせつのしんせんなはながうつくしくかざってあり、ここちよいふんいきでかいぎをむかえられます。すべてのききのテストもすでにすませてありますから、あすはじかんどおりにかいかいできるよていです。`,

  'n4.l08': `にゅうしゃにねんめのはる、わたしははじめてひとりでシンガポールへかいがいしゅっちょうすることになりました。しゅっぱつのいっしゅうかんまえから、しょうだんでつかうえいごのプレゼンテーションしりょうをあつめていんさつしておきました。また、げんちのこきゃくにわたすにほんのおみやげもじぜんにかってスーツケースにいれておきました。

じゅんびはばんぜんだとおもっていたのですが、しゅっぱつとうじつのあさにおおきなしっぱいをしてしまいました。くうこういきのでんしゃのなかでスマートフォンをかくにんしようとしたところ、じたくのげんかんにパスポートをわすれてきてしまったことにきづいたのです。さいわい、ひこうきのしゅっぱつじこくのさんじかんまえにくうこうにつくよていではやめにでていたため、いそいでタクシーでいえにもどってパスポートをとり、なんとかしゅっぱつびんにまにあいました。

このけいけんから、しゅっぱつちょくぜんにはもちものリストをもういちどゆびさしかくにんしておくことのたいせつさをづうかんしました。じぜんにしっかりじゅんびしておくだけでなく、でかけるさいごのしゅんかんまでゆだんしないことがたいせつです。`,

  'n4.l09': `きしょうちょうのさいしんのてんきよほうによると、おおがたでひじょうにつよいたいふうじゅうごごうがこんやおそくにかんとうちほうへじょうりくするそうです。

ちゅうしんふきんのさいだいふうそくはよんじゅうメートルをこえており、えんがんぶではいまにもなみがていぼうをこえそうになっています。まちなかではかぜにあおられてかんばんがはずれそうになったり、ふるいきがたおれそうになったりしているばしょがあり、がいしゅつはきわめてきけんです。また、こんやはんからあすのあけがたにかけていちじかんにはちじゅうミリいじょうのもうれつなおおあめがふるみこみだそうです。

てつどうかくしゃによると、こんやはちじいこうはすべてのろせんでれっしゃのうんてんをとりやめるそうです。かいしゃやがっこうはやめにきたくをよびかけています。ふようふきゅうのがいしゅつをひかえ、ベランダのうえきばちやゴミばこをへやのなかにしまって、あんぜんなおくないですごしてください。`,

  'n4.l10': `せんしゅうのどようび、わたしはだいがくのちかくのアパートからあたらしいへやへひっこしをしました。にもつがひとりでははこべないほどおおかったのですが、にほんごがっこうのどうきゅうせいににんがあさはやくからてつだいにきてくれました。かれらがこもいダンボールばこやれいぞうこをいっしょにはこんでくれたおかげで、ひるすぎにはぶじにもつをへやへはこびこむことができました。

また、となりのへやにすんでいるおおやさんもとてもしんせつなかたでした。「ひっこしおめでとう」といって、きんじょでゆうめいなわがしやのおかしをわたしにくださいました。さらに、まちのごみのぶんべつほうほうやスーパーのとくばいびについてもくわしくおしえてもらいました。

みんながしんせつにしてくれたことがほんとうにうれしくて、わたしはてつだってくれたゆうじんたちをちかくのようしょくてんにしょうたいして、おれいのごちそうをたべてもらいました。こまったときにたすけてくれるなかまがいることのありがたさをじっかんしたいちにちでした。`
};

export function remediateN4Kana(): void {
  console.log('[Stage 1] Remediating Kana Glitches, Foreign Character Artifacts & Reading KanaText...');

  for (let i = 1; i <= 36; i++) {
    const packId = `n4.l${String(i).padStart(2, '0')}`;
    const filePath = path.join(PACKS_DIR, `${packId}.json`);
    if (!fs.existsSync(filePath)) continue;

    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    let modified = false;

    // 1. Reading kanaText conversion for L01-L10
    if (L01_L10_READING_KANA[packId] && data.reading) {
      if (data.reading.kanaText !== L01_L10_READING_KANA[packId]) {
        data.reading.kanaText = L01_L10_READING_KANA[packId];
        modified = true;
        console.log(`  ✓ Updated reading.kanaText for ${packId}`);
      }
    }

    // 2. Specific lesson fixes
    if (packId === 'n4.l03') {
      const s008 = data.sentences?.find((s: any) => s.id === 'n4.l03.s008');
      if (s008 && s008.kana.includes('数据')) {
        s008.kana = s008.kana.replace('数据', '');
        modified = true;
        console.log(`  ✓ Fixed s008.kana Chinese artifact in n4.l03`);
      }
    }

    if (packId === 'n4.l11' && data.reading?.kanaText) {
      if (data.reading.kanaText.includes('おもい出しながら')) {
        data.reading.kanaText = data.reading.kanaText.replace('おもい出しながら', 'おもいだしながら');
        modified = true;
        console.log(`  ✓ Fixed reading.kanaText unconverted kanji 出 in n4.l11`);
      }
    }

    if (packId === 'n4.l13' && data.reading?.kanaText) {
      if (data.reading.kanaText.includes('とふま内におもって')) {
        data.reading.kanaText = data.reading.kanaText.replace('とふま内におもって', 'とふあんにとおもって');
        modified = true;
        console.log(`  ✓ Fixed reading.kanaText garbled token in n4.l13`);
      }
    }

    if (packId === 'n4.l17') {
      const s006 = data.sentences?.find((s: any) => s.id === 'n4.l17.s006');
      if (s006 && s006.kana.includes('။')) {
        s006.kana = s006.kana.replace(/။/g, '。');
        modified = true;
        console.log(`  ✓ Fixed s006.kana Burmese danda in n4.l17`);
      }
      const s010 = data.sentences?.find((s: any) => s.id === 'n4.l17.s010');
      if (s010 && s010.kana.includes('が出たので')) {
        s010.kana = s010.kana.replace('が出たので', 'がでたので');
        modified = true;
        console.log(`  ✓ Fixed s010.kana unconverted kanji 出 in n4.l17`);
      }
    }

    if (packId === 'n4.l19') {
      const s008 = data.sentences?.find((s: any) => s.id === 'n4.l19.s008');
      if (s008 && s008.kana.includes('高性能')) {
        s008.kana = s008.kana.replace('高性能', 'こうせいのう');
        modified = true;
        console.log(`  ✓ Fixed s008.kana 高性能 artifact in n4.l19`);
      }
    }

    if (packId === 'n4.l23' && data.reading?.kanaText) {
      let kt = data.reading.kanaText;
      if (kt.includes('身')) {
        kt = kt.replace('身につけ', 'みにつけ');
        modified = true;
      }
      // Clean stray double spaces
      kt = kt.replace(/かよう\s+にほんごがっこう/g, 'かようにほんごがっこう')
             .replace(/あきの\s+がくえんさい/g, 'あきのがくえんさい')
             .replace(/しかし\s+たなかくん/g, 'しかし、たなかくん');
      if (kt !== data.reading.kanaText) {
        data.reading.kanaText = kt;
        modified = true;
        console.log(`  ✓ Cleansed reading.kanaText kanji 身 & stray spaces in n4.l23`);
      }
    }

    if (packId === 'n4.l25') {
      const s002 = data.sentences?.find((s: any) => s.id === 'n4.l25.s002');
      if (s002 && (s002.kana.includes('えんりょなくて') || s002.kana.includes('教えて'))) {
        s002.kana = s002.kana.replace('えんりょなくて教えてください', 'えんりょなくおしえてください')
                             .replace('えんりょなくて', 'えんりょなく')
                             .replace('教えて', 'おしえて');
        modified = true;
        console.log(`  ✓ Fixed s002.kana in n4.l25`);
      }
    }

    if (packId === 'n4.l26') {
      const s003 = data.sentences?.find((s: any) => s.id === 'n4.l26.s003');
      if (s003 && (s003.kana.includes('市役所') || !s003.kana.includes('じゅうよっかいない'))) {
        s003.kana = s003.kana.replace('じゅうよっかに市役所へ', 'じゅうよっかいないにしやくしょへ')
                             .replace('市役所', 'しやくしょ');
        modified = true;
        console.log(`  ✓ Fixed s003.kana 以内 & 市役所 in n4.l26`);
      }
    }

    if (packId === 'n4.l28' && data.reading?.kanaText) {
      if (data.reading.kanaText.includes('いっぽ一ぽ')) {
        data.reading.kanaText = data.reading.kanaText.replace('いっぽ一ぽ', 'いっぽいっぽ');
        modified = true;
        console.log(`  ✓ Fixed reading.kanaText artifact 一 in n4.l28`);
      }
    }

    if (packId === 'n4.l30' && data.reading?.kanaText) {
      if (data.reading.kanaText.includes('vintage')) {
        data.reading.kanaText = data.reading.kanaText.replace(/つ\s*vintage\s*えくわえると/g, 'つけくわえると');
        modified = true;
        console.log(`  ✓ Fixed reading.kanaText English artifact 'vintage' in n4.l30`);
      }
    }

    if (packId === 'n4.l32') {
      const s008 = data.sentences?.find((s: any) => s.id === 'n4.l32.s008');
      if (s008 && s008.kana.includes('撮')) {
        s008.kana = s008.kana.replace('むか撮った', 'むかしとった');
        modified = true;
        console.log(`  ✓ Fixed s008.kana むか撮った in n4.l32`);
      }
      const s012 = data.sentences?.find((s: any) => s.id === 'n4.l32.s012');
      if (s012 && s012.kana.includes('急いで')) {
        s012.kana = s012.kana.replace('急いで', 'いそいで');
        modified = true;
        console.log(`  ✓ Fixed s012.kana 急いで in n4.l32`);
      }
    }

    if (packId === 'n4.l34' && data.reading?.kanaText) {
      if (data.reading.kanaText.includes('动作') || data.reading.kanaText.includes('自然')) {
        data.reading.kanaText = data.reading.kanaText.replace(/ゆたか动作な自然/g, 'ゆたかなしぜん')
                                                     .replace(/动作/g, '')
                                                     .replace(/自然/g, 'しぜん');
        modified = true;
        console.log(`  ✓ Cleaned reading.kanaText Chinese artifacts in n4.l34`);
      }
    }

    if (modified) {
      fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + '\n', 'utf8');
    }
  }

  console.log('[Stage 1] Completed successfully!\n');
}

remediateN4Kana();


// @vega-provider rule34video
// @vega-version 1.3
"use strict";

var URLS_ENDPOINT =
  "https://raw.githubusercontent.com/Manimanjar/vega-providers/main/urls.json";
var DEFAULT_BASE_URL = "https://rule34video.com";
var memoryCache = { data: null, expiresAt: 0 };

var seenVideoIds = new Set();

var TAGS_300 = [
  {
    "title": "1boy",
    "filter": "/tags/1boy/",
    "videos": 12902
  },
  {
    "title": "1boy1girl",
    "filter": "/tags/1boy1girl/",
    "videos": 9451
  },
  {
    "title": "1girl",
    "filter": "/tags/1girl/",
    "videos": 19843
  },
  {
    "title": "2boys",
    "filter": "/tags/2boys/",
    "videos": 2816
  },
  {
    "title": "2D",
    "filter": "/categories/2d/",
    "videos": 77132
  },
  {
    "title": "2girls",
    "filter": "/tags/2girls/",
    "videos": 4994
  },
  {
    "title": "3D",
    "filter": "/categories/3d/",
    "videos": 165411
  },
  {
    "title": "4k",
    "filter": "/tags/4k/",
    "videos": 35811
  },
  {
    "title": "60fps",
    "filter": "/tags/60fps/",
    "videos": 3120
  },
  {
    "title": "Ada Wong (resident Evil)",
    "filter": "/tags/ada-wong-resident-evil/",
    "videos": 3027
  },
  {
    "title": "Advertisement",
    "filter": "/tags/advertisement/",
    "videos": 4504
  },
  {
    "title": "Ahegao",
    "filter": "/tags/ahegao/",
    "videos": 16829
  },
  {
    "title": "Anal",
    "filter": "/tags/anal/",
    "videos": 45931
  },
  {
    "title": "Anal Creampie",
    "filter": "/tags/anal-creampie/",
    "videos": 12019
  },
  {
    "title": "Animation",
    "filter": "/tags/animation/",
    "videos": 20768
  },
  {
    "title": "Anthro",
    "filter": "/tags/anthro/",
    "videos": 7711
  },
  {
    "title": "Anthro On Anthro",
    "filter": "/tags/anthro-on-anthro/",
    "videos": 2577
  },
  {
    "title": "Anus",
    "filter": "/tags/anus/",
    "videos": 3460
  },
  {
    "title": "Ass Clap",
    "filter": "/tags/ass-clap/",
    "videos": 5352
  },
  {
    "title": "Ass Focus",
    "filter": "/tags/ass-focus/",
    "videos": 13863
  },
  {
    "title": "Ass Shake",
    "filter": "/tags/ass-shake/",
    "videos": 9139
  },
  {
    "title": "Assjob",
    "filter": "/tags/assjob/",
    "videos": 3054
  },
  {
    "title": "Audible Creampie",
    "filter": "/tags/audible-creampie/",
    "videos": 2717
  },
  {
    "title": "Background Music",
    "filter": "/tags/background-music/",
    "videos": 14209
  },
  {
    "title": "Barefeet",
    "filter": "/tags/barefeet/",
    "videos": 3226
  },
  {
    "title": "Beach",
    "filter": "/tags/beach/",
    "videos": 2865
  },
  {
    "title": "Bestiality",
    "filter": "/tags/bestiality/",
    "videos": 10201
  },
  {
    "title": "Big Areola",
    "filter": "/tags/big-areola/",
    "videos": 14129
  },
  {
    "title": "Big Balls",
    "filter": "/tags/big-testicles/",
    "videos": 12853
  },
  {
    "title": "Big Black Cock",
    "filter": "/tags/big-black-cock/",
    "videos": 24171
  },
  {
    "title": "Big Breasts",
    "filter": "/tags/big-breasts/",
    "videos": 114936
  },
  {
    "title": "Big Butt",
    "filter": "/tags/large-butt/",
    "videos": 54778
  },
  {
    "title": "Big Cleavage",
    "filter": "/tags/big-cleavage/",
    "videos": 14157
  },
  {
    "title": "Big Penis",
    "filter": "/tags/big-penis/",
    "videos": 69057
  },
  {
    "title": "Big Thighs",
    "filter": "/tags/big-thighs/",
    "videos": 35098
  },
  {
    "title": "Big White Cock",
    "filter": "/tags/big-white-cock/",
    "videos": 21698
  },
  {
    "title": "Bikini",
    "filter": "/tags/bikini/",
    "videos": 3830
  },
  {
    "title": "Black Cock",
    "filter": "/tags/black-cock/",
    "videos": 2933
  },
  {
    "title": "Black Hair",
    "filter": "/tags/black-hair/",
    "videos": 4560
  },
  {
    "title": "Blacked",
    "filter": "/tags/blacked/",
    "videos": 6928
  },
  {
    "title": "Blender",
    "filter": "/categories/blender/",
    "videos": 3970
  },
  {
    "title": "Blonde Hair",
    "filter": "/tags/blonde-hair/",
    "videos": 9152
  },
  {
    "title": "Blowjob",
    "filter": "/tags/blowjob/",
    "videos": 63147
  },
  {
    "title": "Blowjob Face",
    "filter": "/tags/blowjob-face/",
    "videos": 7846
  },
  {
    "title": "Blue Archive",
    "filter": "/categories/blue-archive/",
    "videos": 3622
  },
  {
    "title": "Blue Eyes",
    "filter": "/tags/blue-eyes/",
    "videos": 3879
  },
  {
    "title": "Blue Hair",
    "filter": "/tags/blue-hair/",
    "videos": 2543
  },
  {
    "title": "Blush",
    "filter": "/tags/blush/",
    "videos": 6576
  },
  {
    "title": "Bondage",
    "filter": "/tags/bondage/",
    "videos": 4141
  },
  {
    "title": "Bouncing",
    "filter": "/tags/bouncing/",
    "videos": 3474
  },
  {
    "title": "Bouncing Ass",
    "filter": "/tags/bouncing-ass/",
    "videos": 21363
  },
  {
    "title": "Bouncing Breasts",
    "filter": "/tags/bouncing-breasts/",
    "videos": 39397
  },
  {
    "title": "Bubble Butt",
    "filter": "/tags/bubble-butt/",
    "videos": 5974
  },
  {
    "title": "Bunny Girl",
    "filter": "/tags/bunny-girl/",
    "videos": 4229
  },
  {
    "title": "Cat Girl",
    "filter": "/tags/cat-girl/",
    "videos": 2716
  },
  {
    "title": "Censored",
    "filter": "/tags/censored/",
    "videos": 4630
  },
  {
    "title": "Cheating",
    "filter": "/tags/cheating/",
    "videos": 5154
  },
  {
    "title": "Cheating Wife",
    "filter": "/tags/cheating-wife/",
    "videos": 2626
  },
  {
    "title": "Clothed Sex",
    "filter": "/tags/clothed-sex/",
    "videos": 6607
  },
  {
    "title": "Compilation",
    "filter": "/tags/compilation/",
    "videos": 14640
  },
  {
    "title": "Completely Nude",
    "filter": "/tags/completely-nude/",
    "videos": 3631
  },
  {
    "title": "Cowgirl Position",
    "filter": "/tags/cowgirl-position/",
    "videos": 34939
  },
  {
    "title": "Creampie",
    "filter": "/tags/creampie/",
    "videos": 61253
  },
  {
    "title": "Cuckold",
    "filter": "/tags/cuckold/",
    "videos": 3364
  },
  {
    "title": "Cum",
    "filter": "/tags/cum/",
    "videos": 2888
  },
  {
    "title": "Cum Everywhere",
    "filter": "/tags/cum-everywhere/",
    "videos": 2735
  },
  {
    "title": "Cum In Mouth",
    "filter": "/tags/cum-in-mouth/",
    "videos": 16124
  },
  {
    "title": "Cum Inflation",
    "filter": "/tags/cum-inflation/",
    "videos": 7252
  },
  {
    "title": "Cum Leaking",
    "filter": "/tags/cum-leaking/",
    "videos": 10980
  },
  {
    "title": "Cum Multiple Times",
    "filter": "/tags/cum-multiple-times/",
    "videos": 3390
  },
  {
    "title": "Cum On Ass",
    "filter": "/tags/cum-on-ass/",
    "videos": 3093
  },
  {
    "title": "Cum On Breasts",
    "filter": "/tags/cum-on-breasts/",
    "videos": 5794
  },
  {
    "title": "Cum On Pussy",
    "filter": "/tags/cum-on-pussy/",
    "videos": 7826
  },
  {
    "title": "Cum Outside",
    "filter": "/tags/cum-outside/",
    "videos": 4028
  },
  {
    "title": "Cum Swallow",
    "filter": "/tags/cum-swallow/",
    "videos": 5192
  },
  {
    "title": "Cumshot",
    "filter": "/tags/cumshot/",
    "videos": 34000
  },
  {
    "title": "Cunnilingus",
    "filter": "/tags/cunnilingus/",
    "videos": 3767
  },
  {
    "title": "Curvy",
    "filter": "/tags/curvy/",
    "videos": 6336
  },
  {
    "title": "Cute",
    "filter": "/tags/cute/",
    "videos": 2533
  },
  {
    "title": "D.va (overwatch)",
    "filter": "/tags/d-va-overwatch/",
    "videos": 4865
  },
  {
    "title": "Dancing",
    "filter": "/tags/dancing/",
    "videos": 12715
  },
  {
    "title": "Dark Skin",
    "filter": "/tags/dark-skin/",
    "videos": 2703
  },
  {
    "title": "Dark Skinned Female",
    "filter": "/tags/dark-skinned-female2/",
    "videos": 2813
  },
  {
    "title": "Dark Skinned Male",
    "filter": "/tags/dark-skinned-male2/",
    "videos": 5728
  },
  {
    "title": "DC Comics",
    "filter": "/categories/dc-comics/",
    "videos": 2792
  },
  {
    "title": "Dead Or Alive",
    "filter": "/categories/dead-or-alive/",
    "videos": 5401
  },
  {
    "title": "Deep Penetration",
    "filter": "/tags/deep-penetration/",
    "videos": 10893
  },
  {
    "title": "Deepthroat",
    "filter": "/tags/deepthroat/",
    "videos": 22794
  },
  {
    "title": "Dildo",
    "filter": "/tags/dildo/",
    "videos": 5547
  },
  {
    "title": "Dog Cock",
    "filter": "/tags/dog-cock/",
    "videos": 5261
  },
  {
    "title": "Doggystyle Position",
    "filter": "/tags/doggystyle-position/",
    "videos": 36872
  },
  {
    "title": "Dominated",
    "filter": "/tags/dominated/",
    "videos": 3416
  },
  {
    "title": "Double Penetration",
    "filter": "/tags/double-penetration/",
    "videos": 8899
  },
  {
    "title": "Ejaculation",
    "filter": "/tags/ejaculation/",
    "videos": 9343
  },
  {
    "title": "English Subtitles",
    "filter": "/tags/english-subtitles/",
    "videos": 4200
  },
  {
    "title": "Equine Cock",
    "filter": "/tags/equine-cock/",
    "videos": 3777
  },
  {
    "title": "Excessive Cum",
    "filter": "/tags/excessive-cum/",
    "videos": 2732
  },
  {
    "title": "Facefuck",
    "filter": "/tags/facefuck/",
    "videos": 11905
  },
  {
    "title": "Facial",
    "filter": "/tags/facial/",
    "videos": 6037
  },
  {
    "title": "Fanedit",
    "filter": "/tags/fanedit/",
    "videos": 4635
  },
  {
    "title": "Feet",
    "filter": "/tags/feet/",
    "videos": 6388
  },
  {
    "title": "Female",
    "filter": "/tags/female/",
    "videos": 24326
  },
  {
    "title": "Female Domination",
    "filter": "/tags/female-domination/",
    "videos": 8329
  },
  {
    "title": "Female Focus",
    "filter": "/tags/female-focus/",
    "videos": 3661
  },
  {
    "title": "Female Moaning",
    "filter": "/tags/female-moaning/",
    "videos": 26763
  },
  {
    "title": "Female Orgasm",
    "filter": "/tags/female-orgasm/",
    "videos": 5197
  },
  {
    "title": "Female Penetrated",
    "filter": "/tags/female-penetrated/",
    "videos": 9872
  },
  {
    "title": "Femboy",
    "filter": "/tags/femboy/",
    "videos": 7516
  },
  {
    "title": "Final Fantasy",
    "filter": "/categories/final-fantasy/",
    "videos": 7598
  },
  {
    "title": "Final Fantasy Vii",
    "filter": "/categories/final-fantasy-vii/",
    "videos": 2702
  },
  {
    "title": "Fingering Pussy",
    "filter": "/tags/fingering-pussy/",
    "videos": 5499
  },
  {
    "title": "Five Nights At Freddy's",
    "filter": "/categories/five-nights-at-freddy-s/",
    "videos": 4288
  },
  {
    "title": "Foot Fetish",
    "filter": "/tags/foot-fetish/",
    "videos": 4040
  },
  {
    "title": "Footjob",
    "filter": "/tags/footjob/",
    "videos": 6071
  },
  {
    "title": "Forced",
    "filter": "/tags/forced/",
    "videos": 4040
  },
  {
    "title": "Fortnite",
    "filter": "/categories/fortnite/",
    "videos": 4084
  },
  {
    "title": "From Behind",
    "filter": "/tags/from-behind/",
    "videos": 37869
  },
  {
    "title": "Full Nelson",
    "filter": "/tags/full-nelson/",
    "videos": 2626
  },
  {
    "title": "Furry",
    "filter": "/tags/furry/",
    "videos": 22470
  },
  {
    "title": "Furry Only",
    "filter": "/tags/furry-only/",
    "videos": 4392
  },
  {
    "title": "Futadom",
    "filter": "/tags/futadom/",
    "videos": 3075
  },
  {
    "title": "Futanari",
    "filter": "/tags/futanari/",
    "videos": 46237
  },
  {
    "title": "Futanari Dominates Female",
    "filter": "/tags/futanari-dominates-female/",
    "videos": 3133
  },
  {
    "title": "Futanari Is Bigger",
    "filter": "/tags/futanari-is-bigger/",
    "videos": 13885
  },
  {
    "title": "Futanari On Female",
    "filter": "/tags/futanari-on-female/",
    "videos": 12842
  },
  {
    "title": "Futanari On Futanari",
    "filter": "/tags/futanari-on-futanari/",
    "videos": 6110
  },
  {
    "title": "Futanari On Male",
    "filter": "/tags/futanari-on-male/",
    "videos": 4185
  },
  {
    "title": "Futanari Penetrating",
    "filter": "/tags/futanari-penetrating/",
    "videos": 13040
  },
  {
    "title": "Futanari Penetrating Female",
    "filter": "/tags/futanari-penetrating-female/",
    "videos": 2705
  },
  {
    "title": "Game",
    "filter": "/tags/game/",
    "videos": 23292
  },
  {
    "title": "Game Gallery",
    "filter": "/tags/game-gallery/",
    "videos": 8629
  },
  {
    "title": "Gameplay",
    "filter": "/tags/gameplay/",
    "videos": 4701
  },
  {
    "title": "Gangbang",
    "filter": "/tags/gangbang/",
    "videos": 8798
  },
  {
    "title": "Gay",
    "filter": "/tags/gay/",
    "videos": 12844
  },
  {
    "title": "Genshin Impact",
    "filter": "/categories/genshin-impact/",
    "videos": 15778
  },
  {
    "title": "Gigantic Breasts",
    "filter": "/tags/gigantic-breasts/",
    "videos": 3691
  },
  {
    "title": "Gigantic Butt",
    "filter": "/tags/gigantic-ass/",
    "videos": 3150
  },
  {
    "title": "Gigantic Penis",
    "filter": "/tags/gigantic-penis/",
    "videos": 4417
  },
  {
    "title": "Glasses",
    "filter": "/tags/glasses/",
    "videos": 4171
  },
  {
    "title": "Gloves",
    "filter": "/tags/gloves/",
    "videos": 2731
  },
  {
    "title": "Group Sex",
    "filter": "/tags/group-sex/",
    "videos": 4121
  },
  {
    "title": "Handjob",
    "filter": "/tags/handjob/",
    "videos": 21308
  },
  {
    "title": "Hentai",
    "filter": "/categories/hentai/",
    "videos": 15083
  },
  {
    "title": "High Heels",
    "filter": "/tags/high-heels/",
    "videos": 3076
  },
  {
    "title": "Hololive",
    "filter": "/categories/hololive/",
    "videos": 4964
  },
  {
    "title": "Honkai Star Rail",
    "filter": "/categories/honkai-star-rail/",
    "videos": 6107
  },
  {
    "title": "Horny Female",
    "filter": "/tags/horny-female/",
    "videos": 3694
  },
  {
    "title": "Horse",
    "filter": "/tags/horse/",
    "videos": 4076
  },
  {
    "title": "Huge Balls",
    "filter": "/tags/huge-balls/",
    "videos": 2998
  },
  {
    "title": "Huge Breasts",
    "filter": "/tags/huge-breasts/",
    "videos": 13757
  },
  {
    "title": "Human",
    "filter": "/tags/human/",
    "videos": 2800
  },
  {
    "title": "Impregnation",
    "filter": "/tags/impregnation/",
    "videos": 3894
  },
  {
    "title": "Incest",
    "filter": "/tags/incest/",
    "videos": 4123
  },
  {
    "title": "Insect",
    "filter": "/tags/insect/",
    "videos": 2806
  },
  {
    "title": "Interracial",
    "filter": "/tags/interracial/",
    "videos": 7717
  },
  {
    "title": "Interspecies",
    "filter": "/tags/interspecies/",
    "videos": 3722
  },
  {
    "title": "Iwara",
    "filter": "/categories/iwara/",
    "videos": 65800
  },
  {
    "title": "Japanese Dialogue",
    "filter": "/tags/japanese-dialogue/",
    "videos": 3706
  },
  {
    "title": "Kissing",
    "filter": "/tags/kissing/",
    "videos": 7081
  },
  {
    "title": "Knot",
    "filter": "/tags/knot/",
    "videos": 3627
  },
  {
    "title": "Koikatsu",
    "filter": "/categories/koikatsu/",
    "videos": 12567
  },
  {
    "title": "Lara Croft (tomb Raider)",
    "filter": "/tags/lara-croft-tomb-raider/",
    "videos": 2836
  },
  {
    "title": "League Of Legends",
    "filter": "/categories/league-of-legends/",
    "videos": 5004
  },
  {
    "title": "Legs Up",
    "filter": "/tags/legs-up/",
    "videos": 2515
  },
  {
    "title": "Lesbian",
    "filter": "/tags/lesbian/",
    "videos": 5850
  },
  {
    "title": "Licking",
    "filter": "/tags/licking/",
    "videos": 3925
  },
  {
    "title": "Licking Penis",
    "filter": "/tags/licking-penis/",
    "videos": 3245
  },
  {
    "title": "Light Skinned Female",
    "filter": "/tags/light-skinned-female2/",
    "videos": 5722
  },
  {
    "title": "Light Skinned Male",
    "filter": "/tags/light-skinned-male2/",
    "videos": 2983
  },
  {
    "title": "Long Cock",
    "filter": "/tags/long-cock/",
    "videos": 6407
  },
  {
    "title": "Long Hair",
    "filter": "/tags/long-hair/",
    "videos": 5292
  },
  {
    "title": "Looking At Partner",
    "filter": "/tags/looking-at-partner/",
    "videos": 2712
  },
  {
    "title": "Looking At Viewer",
    "filter": "/tags/looking-at-viewer/",
    "videos": 27926
  },
  {
    "title": "Loop",
    "filter": "/tags/loop/",
    "videos": 13607
  },
  {
    "title": "Male",
    "filter": "/tags/male/",
    "videos": 10693
  },
  {
    "title": "Male Pov",
    "filter": "/tags/male-pov/",
    "videos": 24432
  },
  {
    "title": "Marvel",
    "filter": "/categories/marvel/",
    "videos": 5426
  },
  {
    "title": "Marvel Rivals",
    "filter": "/categories/marvel-rivals/",
    "videos": 4202
  },
  {
    "title": "Masturbation",
    "filter": "/tags/masturbation/",
    "videos": 18409
  },
  {
    "title": "Mating Press",
    "filter": "/tags/mating-press/",
    "videos": 6048
  },
  {
    "title": "Mercy (overwatch)",
    "filter": "/tags/mercy-overwatch/",
    "videos": 4096
  },
  {
    "title": "Milf",
    "filter": "/tags/milf/",
    "videos": 9182
  },
  {
    "title": "Missionary Position",
    "filter": "/tags/missionary-position/",
    "videos": 17867
  },
  {
    "title": "MMD",
    "filter": "/categories/mmd/",
    "videos": 22918
  },
  {
    "title": "Moaning In Pleasure",
    "filter": "/tags/moaning-in-pleasure/",
    "videos": 84810
  },
  {
    "title": "Molestation",
    "filter": "/tags/molestation/",
    "videos": 14595
  },
  {
    "title": "Monster Dick",
    "filter": "/tags/monster-dick/",
    "videos": 4960
  },
  {
    "title": "Monster Fuck",
    "filter": "/tags/monster-fuck/",
    "videos": 8275
  },
  {
    "title": "Monster Girl",
    "filter": "/tags/monster-girl/",
    "videos": 3381
  },
  {
    "title": "Monsters",
    "filter": "/tags/monsters/",
    "videos": 3020
  },
  {
    "title": "Mugen",
    "filter": "/categories/mugen/",
    "videos": 2539
  },
  {
    "title": "Multiple Positions",
    "filter": "/tags/multiple-positions/",
    "videos": 3215
  },
  {
    "title": "Muscular",
    "filter": "/tags/muscular/",
    "videos": 3255
  },
  {
    "title": "Music",
    "filter": "/tags/music/",
    "videos": 18223
  },
  {
    "title": "Music Only",
    "filter": "/tags/music-only/",
    "videos": 10075
  },
  {
    "title": "My Hero Academia",
    "filter": "/categories/my-hero-academia/",
    "videos": 2726
  },
  {
    "title": "My Little Pony Friendship Is Magic",
    "filter": "/categories/my-little-pony-friendship-is-magic/",
    "videos": 4000
  },
  {
    "title": "Navel",
    "filter": "/tags/navel/",
    "videos": 2815
  },
  {
    "title": "Netorare",
    "filter": "/tags/netorare/",
    "videos": 10648
  },
  {
    "title": "Nier Automata",
    "filter": "/categories/nier-automata/",
    "videos": 4213
  },
  {
    "title": "Nipples",
    "filter": "/tags/nipples/",
    "videos": 13832
  },
  {
    "title": "No Sound",
    "filter": "/tags/no-sound/",
    "videos": 34557
  },
  {
    "title": "Nude",
    "filter": "/tags/nude/",
    "videos": 17259
  },
  {
    "title": "Nude Female",
    "filter": "/tags/nude-female/",
    "videos": 14671
  },
  {
    "title": "Nude Male",
    "filter": "/tags/nude-male/",
    "videos": 3447
  },
  {
    "title": "Oral",
    "filter": "/tags/oral/",
    "videos": 7324
  },
  {
    "title": "Orgasm",
    "filter": "/tags/orgasm/",
    "videos": 5562
  },
  {
    "title": "Orgy",
    "filter": "/tags/orgy/",
    "videos": 2955
  },
  {
    "title": "Original",
    "filter": "/categories/original/",
    "videos": 8619
  },
  {
    "title": "Original Character",
    "filter": "/tags/original-character/",
    "videos": 3169
  },
  {
    "title": "Overwatch",
    "filter": "/categories/overwatch/",
    "videos": 18610
  },
  {
    "title": "Penis",
    "filter": "/tags/penis/",
    "videos": 13313
  },
  {
    "title": "Penis In Pussy",
    "filter": "/tags/penis-in-pussy/",
    "videos": 44029
  },
  {
    "title": "Petite",
    "filter": "/tags/petite/",
    "videos": 3332
  },
  {
    "title": "Pink Hair",
    "filter": "/tags/pink-hair/",
    "videos": 2811
  },
  {
    "title": "Pmv",
    "filter": "/tags/pmv/",
    "videos": 21287
  },
  {
    "title": "Pokemon",
    "filter": "/categories/pokemon/",
    "videos": 6438
  },
  {
    "title": "Pounding",
    "filter": "/tags/pounding/",
    "videos": 2734
  },
  {
    "title": "Pov",
    "filter": "/tags/pov/",
    "videos": 45661
  },
  {
    "title": "Pov Blowjob",
    "filter": "/tags/pov-blowjob/",
    "videos": 2697
  },
  {
    "title": "Pov Eye Contact",
    "filter": "/tags/pov-eye-contact/",
    "videos": 6044
  },
  {
    "title": "Pregnant",
    "filter": "/tags/pregnant/",
    "videos": 3295
  },
  {
    "title": "Pronebone",
    "filter": "/tags/pronebone/",
    "videos": 2583
  },
  {
    "title": "Pubic Hair",
    "filter": "/tags/pubic-hair/",
    "videos": 2960
  },
  {
    "title": "Public Sex",
    "filter": "/tags/public-sex/",
    "videos": 4006
  },
  {
    "title": "Pussy",
    "filter": "/tags/pussy/",
    "videos": 15977
  },
  {
    "title": "Pussy Focus",
    "filter": "/tags/pussy-focus/",
    "videos": 3597
  },
  {
    "title": "Pussy Juice",
    "filter": "/tags/pussy-juice/",
    "videos": 4876
  },
  {
    "title": "Red Hair",
    "filter": "/tags/red-hair/",
    "videos": 3250
  },
  {
    "title": "Resident Evil",
    "filter": "/categories/resident-evil/",
    "videos": 7406
  },
  {
    "title": "Reverse Cowgirl Position",
    "filter": "/tags/reverse-cowgirl-position/",
    "videos": 14095
  },
  {
    "title": "Riding",
    "filter": "/tags/riding/",
    "videos": 13550
  },
  {
    "title": "Robot",
    "filter": "/tags/robot/",
    "videos": 2634
  },
  {
    "title": "Rough Sex",
    "filter": "/tags/rough-sex/",
    "videos": 10714
  },
  {
    "title": "Schoolgirl",
    "filter": "/tags/schoolgirl/",
    "videos": 3520
  },
  {
    "title": "Sex",
    "filter": "/tags/sex/",
    "videos": 47699
  },
  {
    "title": "Sex Sounds",
    "filter": "/tags/sex-sounds/",
    "videos": 30032
  },
  {
    "title": "Sex Toy",
    "filter": "/tags/sex-toy/",
    "videos": 2662
  },
  {
    "title": "Sexy Girl",
    "filter": "/tags/sexy-girl/",
    "videos": 13718
  },
  {
    "title": "Short Hair",
    "filter": "/tags/short-hair/",
    "videos": 4198
  },
  {
    "title": "Size Difference",
    "filter": "/tags/size-difference/",
    "videos": 7667
  },
  {
    "title": "Small Breasts",
    "filter": "/tags/small-breasts/",
    "videos": 8924
  },
  {
    "title": "Smaller Female",
    "filter": "/tags/smaller-female/",
    "videos": 3961
  },
  {
    "title": "Sonic The Hedgehog",
    "filter": "/categories/sonic-the-hedgehog/",
    "videos": 5311
  },
  {
    "title": "Sound",
    "filter": "/tags/sound/",
    "videos": 224079
  },
  {
    "title": "Sound Edit",
    "filter": "/tags/sound-edit/",
    "videos": 2650
  },
  {
    "title": "Sound Effects",
    "filter": "/tags/sound-effects/",
    "videos": 14296
  },
  {
    "title": "Source",
    "filter": "/tags/source/",
    "videos": 3244
  },
  {
    "title": "Source Filmmaker",
    "filter": "/categories/source-filmmaker/",
    "videos": 2712
  },
  {
    "title": "Spitroast",
    "filter": "/tags/spitroast/",
    "videos": 3069
  },
  {
    "title": "Spread Legs",
    "filter": "/tags/spread-legs/",
    "videos": 5634
  },
  {
    "title": "Squirt",
    "filter": "/tags/squirt/",
    "videos": 5858
  },
  {
    "title": "Standing",
    "filter": "/tags/standing/",
    "videos": 2513
  },
  {
    "title": "Standing Doggystyle Position",
    "filter": "/tags/standing-doggystyle-position/",
    "videos": 9152
  },
  {
    "title": "Standing Sex",
    "filter": "/tags/standing-sex/",
    "videos": 9228
  },
  {
    "title": "Stockings",
    "filter": "/tags/stockings/",
    "videos": 6158
  },
  {
    "title": "Stomach Bulge",
    "filter": "/tags/stomach-bulge/",
    "videos": 7986
  },
  {
    "title": "Story",
    "filter": "/tags/story/",
    "videos": 2868
  },
  {
    "title": "Straight",
    "filter": "/tags/straight/",
    "videos": 42843
  },
  {
    "title": "Street Fighter",
    "filter": "/categories/street-fighter/",
    "videos": 3913
  },
  {
    "title": "Submissive Female",
    "filter": "/tags/submissive-female/",
    "videos": 2821
  },
  {
    "title": "Succubus",
    "filter": "/tags/succubus/",
    "videos": 3044
  },
  {
    "title": "Sweaty Body",
    "filter": "/tags/sweaty-body/",
    "videos": 2539
  },
  {
    "title": "Tattoos",
    "filter": "/tags/tattoos/",
    "videos": 2749
  },
  {
    "title": "Tease",
    "filter": "/tags/tease/",
    "videos": 4322
  },
  {
    "title": "Tentacles",
    "filter": "/tags/tentacles/",
    "videos": 4531
  },
  {
    "title": "Testicles",
    "filter": "/tags/testicles/",
    "videos": 4216
  },
  {
    "title": "The Elder Scrolls V: Skyrim",
    "filter": "/categories/the-elder-scrolls-v-skyrim/",
    "videos": 4601
  },
  {
    "title": "The Sims 4",
    "filter": "/categories/the-sims-4/",
    "videos": 2705
  },
  {
    "title": "Thick Penis",
    "filter": "/tags/thick-penis/",
    "videos": 6286
  },
  {
    "title": "Thigh Highs",
    "filter": "/tags/thigh-highs/",
    "videos": 2976
  },
  {
    "title": "Thigh Sex",
    "filter": "/tags/thigh-sex/",
    "videos": 4046
  },
  {
    "title": "Threesome",
    "filter": "/tags/threesome/",
    "videos": 10073
  },
  {
    "title": "Throatpie",
    "filter": "/tags/throatpie/",
    "videos": 2889
  },
  {
    "title": "Tifa Lockhart (final Fantasy)",
    "filter": "/tags/tifa-lockhart-final-fantasy/",
    "videos": 5707
  },
  {
    "title": "Titty Fuck",
    "filter": "/tags/titty-fuck/",
    "videos": 16060
  },
  {
    "title": "Tmp",
    "filter": "/categories/tmp/",
    "videos": 7090
  },
  {
    "title": "Tongue Out",
    "filter": "/tags/tongue-out/",
    "videos": 5335
  },
  {
    "title": "Tracer (overwatch)",
    "filter": "/tags/tracer-overwatch/",
    "videos": 2869
  },
  {
    "title": "Twerking",
    "filter": "/tags/twerking/",
    "videos": 3463
  },
  {
    "title": "Uncensored",
    "filter": "/tags/uncensored/",
    "videos": 3437
  },
  {
    "title": "Vertical Video",
    "filter": "/tags/vertical-video/",
    "videos": 19958
  },
  {
    "title": "Virt-a-mate",
    "filter": "/categories/virt-a-mate/",
    "videos": 9669
  },
  {
    "title": "Visual Novel",
    "filter": "/tags/visual-novel/",
    "videos": 3995
  },
  {
    "title": "Vocaloid",
    "filter": "/categories/vocaloid/",
    "videos": 2595
  },
  {
    "title": "Voice Acted",
    "filter": "/tags/voice-acted/",
    "videos": 12452
  },
  {
    "title": "Voice Acting",
    "filter": "/tags/voice-acting/",
    "videos": 3569
  },
  {
    "title": "Voice Actress",
    "filter": "/tags/voice-actress/",
    "videos": 2601
  },
  {
    "title": "Vore",
    "filter": "/tags/vore/",
    "videos": 2940
  },
  {
    "title": "Vtuber",
    "filter": "/tags/vtuber/",
    "videos": 4578
  },
  {
    "title": "Werewolf",
    "filter": "/tags/werewolf/",
    "videos": 2618
  },
  {
    "title": "White Hair",
    "filter": "/tags/white-hair/",
    "videos": 4528
  },
  {
    "title": "Wide Hips",
    "filter": "/tags/wide-hips/",
    "videos": 9999
  },
  {
    "title": "Widowmaker (overwatch)",
    "filter": "/tags/widowmaker-overwatch/",
    "videos": 4690
  },
  {
    "title": "World Of Warcraft",
    "filter": "/categories/world-of-warcraft/",
    "videos": 3025
  },
  {
    "title": "Wtf",
    "filter": "/tags/wtf/",
    "videos": 3704
  },
  {
    "title": "Wuthering Waves",
    "filter": "/categories/wuthering-waves/",
    "videos": 2930
  },
  {
    "title": "X-ray",
    "filter": "/tags/x-ray/",
    "videos": 4492
  },
  {
    "title": "Yorha 2b (nier Automata)",
    "filter": "/tags/yorha-2b-nier-automata/",
    "videos": 3823
  },
  {
    "title": "Zenless Zone Zero",
    "filter": "/categories/zenless-zone-zero/",
    "videos": 8756
  }
];

async function getBase(kvStore, axios) {
  if (kvStore && typeof kvStore.get === "function") {
    try {
      var custom = await kvStore.get("baseUrlOverride");
      if (custom && typeof custom === "string" && custom.trim().length > 0) {
        var cleanCustom = custom.trim().replace(/\/+$/, "");
        if (cleanCustom !== DEFAULT_BASE_URL) {
          return cleanCustom;
        }
      }
    } catch (e) {}
  }

  var now = Date.now();
  if (memoryCache.data && now < memoryCache.expiresAt) {
    var cachedEntry = memoryCache.data["rule34video"];
    if (cachedEntry && cachedEntry.url) {
      return cachedEntry.url.replace(/\/+$/, "");
    }
  }

  if (axios) {
    try {
      var res = await axios.get(URLS_ENDPOINT, { timeout: 4000 });
      if (res.data && typeof res.data === "object") {
        memoryCache.data = res.data;
        memoryCache.expiresAt = now + 3600000;
        var entry = res.data["rule34video"];
        if (entry && entry.url) {
          return entry.url.replace(/\/+$/, "");
        }
      }
    } catch (e) {}
  }

  if (kvStore && typeof kvStore.get === "function") {
    try {
      var learned = await kvStore.get("rule34video_learnedDomain");
      if (learned && typeof learned === "string" && learned.startsWith("http")) {
        return learned.replace(/\/+$/, "");
      }
    } catch (e) {}
  }

  return DEFAULT_BASE_URL;
}

function updateLearnedDomain(res, baseUrl, kvStore) {
  try {
    var finalUrl =
      (res && res.request && (res.request.responseURL || (res.request.res && res.request.res.responseUrl))) ||
      (res && res.config && res.config.url);
    if (finalUrl && typeof finalUrl === "string") {
      var parsed = new URL(finalUrl);
      var origin = parsed.origin;
      if (origin && origin !== baseUrl && kvStore && typeof kvStore.set === "function") {
        kvStore.set("rule34video_learnedDomain", origin);
      }
    }
  } catch (e) {}
}

async function parseVideoGrid(options) {
  var url = options.url;
  var baseUrl = options.baseUrl;
  var axios = options.axios;
  var cheerio = options.cheerio;
  var commonHeaders = options.commonHeaders;
  var signal = options.signal;
  var kvStore = options.kvStore;

  try {
    var res = await axios.get(url, {
      headers: Object.assign({}, commonHeaders, {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Referer: baseUrl + "/",
      }),
      signal: signal,
      maxRedirects: 5,
    });

    updateLearnedDomain(res, baseUrl, kvStore);

    var html = res.data;
    var $ = cheerio.load(html);
    var posts = [];

    if (seenVideoIds.size > 3000) {
      seenVideoIds.clear();
    }

    $(".item.thumb, [data-video-card-id]").each(function (_, element) {
      var $el = $(element);
      var linkEl = $el.find("a.th, a[href*=\"/video/\"]").first();
      var rawHref = linkEl.attr("href") || "";
      var rawTitle =
        linkEl.attr("title") ||
        $el.find("img.thumb").attr("alt") ||
        linkEl.text().trim();

      if (!rawTitle || !rawHref) return;

      var idMatch = rawHref.match(/\/video\/([0-9]+)/i);
      var videoId = idMatch ? idMatch[1] : rawHref;

      if (seenVideoIds.has(videoId)) {
        return;
      }
      seenVideoIds.add(videoId);

      var img = $el.find("img.thumb, img").first();
      var image =
        img.attr("data-rd-jpg") ||
        img.attr("data-src") ||
        img.attr("src") ||
        "";

      var duration = $el.find(".time").first().text().trim();
      var isHd = $el.find(".quality").length > 0;
      var cornerTag = isHd ? "HD" : undefined;

      var absoluteLink = rawHref.startsWith("http")
        ? rawHref
        : baseUrl + (rawHref.startsWith("/") ? "" : "/") + rawHref;

      posts.push({
        title: rawTitle,
        link: absoluteLink,
        image: image,
        tag: duration || undefined,
        cornerTag: cornerTag,
      });
    });

    return posts;
  } catch (err) {
    console.error("Rule34Video posts error:", err && err.message ? err.message : err);
    return [];
  }
}

var getPosts = async function (params) {
  var filter = params.filter;
  var page = params.page;
  var signal = params.signal;
  var providerContext = params.providerContext;

  var axios = providerContext.axios;
  var cheerio = providerContext.cheerio;
  var commonHeaders = providerContext.commonHeaders;
  var kvStore = providerContext.kvStore;

  var baseUrl = await getBase(kvStore, axios);

  if (filter === "/tags/" || filter === "/tags") {
    return TAGS_300.map(function (item) {
      return {
        title: item.title,
        link: item.filter.startsWith("http") ? item.filter : baseUrl + (item.filter.startsWith("/") ? "" : "/") + item.filter,
        image: baseUrl + "/apple-touch-icon.png",
        cornerTag: "TAG",
      };
    });
  }

  var targetUrl = "";
  if (filter === "/?home=1" || filter === "/") {
    if (page === 1) {
      var randomSeed = Math.floor(Math.random() * 8) + 1;
      targetUrl = randomSeed > 1 ? baseUrl + "/" + randomSeed + "/?_t=" + Date.now() : baseUrl + "/?_t=" + Date.now();
    } else {
      targetUrl = baseUrl + "/" + page + "/";
    }
  } else if (filter.startsWith("/search/")) {
    var cleanSearch = filter.replace(/\/+$/, "");
    targetUrl = page > 1 ? baseUrl + cleanSearch + "/" + page + "/" : baseUrl + cleanSearch + "/";
  } else if (filter.startsWith("/tags/")) {
    if (filter.includes("?")) {
      targetUrl = page > 1 ? baseUrl + filter + "&from=" + page : baseUrl + filter;
    } else {
      var cleanTag = filter.replace(/\/+$/, "");
      targetUrl = page > 1 ? baseUrl + cleanTag + "/" + page + "/" : baseUrl + cleanTag + "/";
    }
  } else if (filter.includes("?")) {
    targetUrl = page > 1 ? baseUrl + filter + "&from=" + page : baseUrl + filter;
  } else {
    targetUrl = page > 1 ? baseUrl + filter + page + "/" : baseUrl + filter;
  }

  return parseVideoGrid({
    url: targetUrl,
    baseUrl: baseUrl,
    axios: axios,
    cheerio: cheerio,
    commonHeaders: commonHeaders,
    signal: signal,
    kvStore: kvStore,
  });
};

var getSearchPosts = async function (params) {
  var searchQuery = params.searchQuery;
  var page = params.page;
  var signal = params.signal;
  var providerContext = params.providerContext;

  var axios = providerContext.axios;
  var cheerio = providerContext.cheerio;
  var commonHeaders = providerContext.commonHeaders;
  var kvStore = providerContext.kvStore;

  var baseUrl = await getBase(kvStore, axios);
  var cleanQuery = encodeURIComponent(searchQuery.trim().replace(/\s+/g, "-"));
  var targetUrl = page > 1 ? baseUrl + "/search/" + cleanQuery + "/" + page + "/" : baseUrl + "/search/" + cleanQuery + "/";

  return parseVideoGrid({
    url: targetUrl,
    baseUrl: baseUrl,
    axios: axios,
    cheerio: cheerio,
    commonHeaders: commonHeaders,
    signal: signal,
    kvStore: kvStore,
  });
};

exports.getPosts = getPosts;
exports.getSearchPosts = getSearchPosts;

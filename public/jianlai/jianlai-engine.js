// ==========================================
// 剑来 · 修仙传 完整剧情引擎 v2
// 人物情感系统 + 原著剧情 + 关系记忆
// ==========================================

// ==================== 音频引擎（精简版） ====================
const AudioEngine = {
  ctx:null,masterGain:null,musicGain:null,sfxGain:null,ambGain:null,
  currentMusic:null,currentAmbient:null,currentTheme:null,
  musicEnabled:true,sfxEnabled:true,
  scale:{gong:[261.63,293.66,329.63,392,440,523.25,587.33,659.25],shang:[293.66,329.63,392,440,523.25,587.33,659.25,783.99],jue:[329.63,392,440,523.25,587.33,659.25,783.99,880],zhi:[392,440,523.25,587.33,659.25,783.99,880,1046.5],yu:[440,523.25,587.33,659.25,783.99,880,1046.5,1174.66]},
  themes:{
    nipingxiang:{scale:'gong',tempo:65,mood:'peaceful',vol:0.12},academy:{scale:'jue',tempo:50,mood:'scholarly',vol:0.10},
    blacksmith:{scale:'zhi',tempo:80,mood:'rhythmic',vol:0.11},pharmacy:{scale:'shang',tempo:55,mood:'calm',vol:0.09},
    town_gate:{scale:'shang',tempo:70,mood:'mysterious',vol:0.13},mountain_temple:{scale:'yu',tempo:40,mood:'lonely',vol:0.08},
    sword_wall:{scale:'zhi',tempo:95,mood:'epic',vol:0.15},lake:{scale:'gong',tempo:50,mood:'flowing',vol:0.10},
    lotus:{scale:'jue',tempo:60,mood:'ethereal',vol:0.12},barbarian:{scale:'yu',tempo:110,mood:'intense',vol:0.14},
    shuyang:{scale:'gong',tempo:50,mood:'scholarly',vol:0.09},title:{scale:'gong',tempo:55,mood:'grand',vol:0.12},
    battle:{scale:'zhi',tempo:120,mood:'intense',vol:0.16},cultivation:{scale:'jue',tempo:40,mood:'meditative',vol:0.08},
    event:{scale:'shang',tempo:90,mood:'dramatic',vol:0.14}
  },
  init:function(){try{this.ctx=new(window.AudioContext||window.webkitAudioContext)();this.masterGain=this.ctx.createGain();this.masterGain.gain.value=0.5;this.masterGain.connect(this.ctx.destination);this.musicGain=this.ctx.createGain();this.musicGain.gain.value=0.25;this.musicGain.connect(this.masterGain);this.sfxGain=this.ctx.createGain();this.sfxGain.gain.value=0.6;this.sfxGain.connect(this.masterGain);this.ambGain=this.ctx.createGain();this.ambGain.gain.value=0.15;this.ambGain.connect(this.masterGain);return true}catch(e){return false}},
  resume:function(){if(this.ctx&&this.ctx.state==='suspended')this.ctx.resume()},
  playNote:function(f,d,ty,de,g,de2){if(!this.ctx||!this.sfxEnabled)return;this.resume();const o=this.ctx.createOscillator(),e=this.ctx.createGain();o.type=ty||'sine';o.frequency.value=f;const t=this.ctx.currentTime+(de||0);e.gain.setValueAtTime(0,t);e.gain.linearRampToValueAtTime(g||0.2,t+0.02);e.gain.exponentialRampToValueAtTime(0.001,t+d);o.connect(e);e.connect(de2||this.sfxGain);o.start(t);o.stop(t+d)},
  playTheme:function(tn){if(!this.ctx||!this.musicEnabled)return;this.resume();this.stopMusic();this.currentTheme=tn;const th=this.themes[tn]||this.themes.title,sc=this.scale[th.scale],md=th.mood,vol=th.vol||0.1,bd=60/(th.tempo||70);let t=this.ctx.currentTime,notes=[];const gen=(arr,mult)=>{arr.forEach((n,i)=>{const idx=n%sc.length;if(idx<sc.length)notes.push({freq:sc[idx],dur:bd*mult(i),type:'triangle',gain:0.6})})};if(md==='peaceful'||md==='calm'||md==='flowing'){const seq=[0,2,4,3,2,0,1,2,4,5,4,2,0,2,4,5];gen(seq,i=>i%3===0?2:1)}else if(md==='scholarly'||md==='meditative'){const seq=[0,1,3,2,1,0,2,4,3,2,1,3,5,4,3,2];gen(seq,i=>1.5)}else if(md==='mysterious'||md==='dramatic'){for(let i=0;i<10;i++){const idx=Math.floor(Math.random()*sc.length);notes.push({freq:sc[idx],dur:bd*(0.8+Math.random()*1.2),type:'sine',gain:0.5})}}else if(md==='epic'||md==='intense'){for(let i=0;i<12;i++){const idx=Math.floor(Math.random()*sc.length);notes.push({freq:sc[idx]*(i%2===0?1:0.5),dur:bd*(i%3===0?2:1),type:i%4===0?'sawtooth':'triangle',gain:0.7})}}else if(md==='lonely'||md==='sorrow'){const seq=[0,2,0,3,1,0,2,0,4,2,0,3,1,0,2,0];gen(seq,i=>2)}else if(md==='grand'){const seq=[0,4,0,5,0,4,0,6,0,5,0,4,0,5,0,7];gen(seq,i=>i%2===0?1.5:1)}else if(md==='rhythmic'){for(let i=0;i<10;i++){const idx=Math.floor(Math.random()*3);if(idx<sc.length)notes.push({freq:sc[idx],dur:bd*0.5,type:'square',gain:0.3})}}else if(md==='ethereal'){for(let i=0;i<10;i++){const idx=Math.floor(Math.random()*sc.length);notes.push({freq:sc[idx]*(1+Math.random()*0.5),dur:bd*(1.5+Math.random()*1),type:'sine',gain:0.4})}}notes.forEach(n=>{this.playNote(n.freq,n.dur,n.type,t-this.ctx.currentTime,n.gain*vol*2,this.musicGain);t+=n.dur});this.currentMusic=setTimeout(()=>{if(this.musicEnabled&&this.currentTheme===tn)this.playTheme(tn)},(t-this.ctx.currentTime)*1000)},
  stopMusic:function(){if(this.currentMusic){clearTimeout(this.currentMusic);this.currentMusic=null}this.stopAmbient()},
  playAmbient:function(type){if(!this.ctx||!this.sfxEnabled)return;this.stopAmbient();this.resume();const buf=this.ctx.createBuffer(1,this.ctx.sampleRate*3,this.ctx.sampleRate),d=buf.getChannelData(0);for(let i=0;i<d.length;i++){if(type==='rain')d[i]=(Math.random()*2-1)*0.08;else if(type==='wind')d[i]=(Math.random()*2-1)*0.03;else if(type==='fire')d[i]=(Math.random()*2-1)*0.04*(0.5+0.5*Math.sin(i*0.003));else if(type==='water')d[i]=(Math.random()*2-1)*0.02*Math.sin(i*0.001);else d[i]=(Math.random()*2-1)*0.02}const src=this.ctx.createBufferSource();src.buffer=buf;src.loop=true;const f=this.ctx.createBiquadFilter();f.type='lowpass';f.frequency.value=type==='rain'?1000:type==='wind'?300:type==='fire'?500:type==='water'?600:800;const g=this.ctx.createGain();g.gain.value=type==='rain'?0.2:type==='wind'?0.15:type==='fire'?0.12:type==='water'?0.1:0.08;src.connect(f);f.connect(g);g.connect(this.ambGain);src.start();this.currentAmbient=src},
  stopAmbient:function(){if(this.currentAmbient){try{this.currentAmbient.stop()}catch(e){}this.currentAmbient=null}},
  playClick:function(){this.playNote(800,0.08,'sine',0,0.15);this.playNote(1200,0.04,'sine',0.02,0.1)},
  playChoice:function(){this.playNote(523,0.12,'triangle',0,0.15);this.playNote(659,0.12,'triangle',0.08,0.12);this.playNote(784,0.15,'triangle',0.16,0.1)},
  playEvent:function(){[392,440,523,659].forEach((f,i)=>this.playNote(f,0.3,'triangle',i*0.12,0.15))},
  playItem:function(){this.playNote(880,0.15,'sine',0,0.15);this.playNote(1046,0.25,'sine',0.08,0.12);this.playNote(1318,0.3,'sine',0.16,0.08)},
  playLevelUp:function(){[523,659,784,1046,1046].forEach((f,i)=>this.playNote(f,0.25,'triangle',i*0.15,0.15))},
  playNegative:function(){this.playNote(300,0.3,'sawtooth',0,0.12);this.playNote(250,0.4,'sawtooth',0.15,0.1)},
  playSword:function(){this.playNote(200,0.1,'sawtooth',0,0.2);this.playNote(800,0.05,'square',0.02,0.15)},
  playHit:function(){this.playNote(150,0.15,'square',0,0.25);this.playNote(100,0.1,'sawtooth',0.05,0.2)},
  playTravel:function(){this.playNote(400,0.2,'triangle',0,0.12);this.playNote(600,0.2,'triangle',0.15,0.1);this.playNote(800,0.3,'triangle',0.3,0.08)},
  toggleMusic:function(){this.musicEnabled=!this.musicEnabled;if(!this.musicEnabled)this.stopMusic();else this.playTheme(this.currentTheme||'title');return this.musicEnabled},
  toggleSfx:function(){this.sfxEnabled=!this.sfxEnabled;return this.sfxEnabled},
  getLocationTheme:function(loc,weather){const m={nipingxiang:'nipingxiang',academy:'academy',blacksmith:'blacksmith',pharmacy:'pharmacy',town_gate:'town_gate',mountain_temple:'mountain_temple',sword_wall:'sword_wall',lake:'lake',lotus:'lotus',barbarian:'barbarian',shuyang:'shuyang'};const t=m[loc]||'town_gate';let a=null;if(weather==='rain'||weather==='thunder')a='rain';else if(weather==='fog'||weather==='snow')a='wind';else if(loc==='lake'||loc==='lotus')a='water';else if(loc==='blacksmith')a='fire';else if(loc==='mountain_temple'||loc==='barbarian')a='wind';return{theme:t,ambient:a}}
};

// ==================== 境界系统 ====================
const REALMS={qi:{name:'练气士',levels:['铜皮','草根','柳筋','骨气','铸炉','洞府','观海','龙门','金丹','元婴','玉璞','仙人','飞升','十四境','十五境']},body:{name:'纯粹武夫',levels:['炼体','易筋','锻骨','通脉','内腑','髓血','金刚','无漏','山巅','气盛','归真','神到']},sword:{name:'剑修',levels:['剑气','剑意','剑心','剑域','剑道','剑神','合道']}};
const QI_R=['未入门','铜皮','草根','柳筋','骨气','铸炉','洞府','观海','龙门','金丹','元婴','玉璞','仙人','飞升','十四境','十五境'];
const BODY_R=['未入门','炼体','易筋','锻骨','通脉','内腑','髓血','金刚','无漏','山巅','气盛','归真','神到'];

// ==================== 人物情感系统（核心） ====================
// 每个角色包含：完整性格、情感线、关系阶段、专属事件、记忆功能
const CHARACTERS = {
  chenpingan: {
    name:'陈平安', id:'chenpingan',
    fullName:'陈平安', nickname:'平安',
    title:'泥瓶巷少年→文圣传人→剑气长城隐官→天下第一',
    appearance:'穿草鞋的清瘦少年，眼神清澈而倔强',
    personality:'温和倔强，重诺如山，话少但每一句都算数。练拳百万，心性坚韧。',
    background:'父母早逝，泥瓶巷孤儿，靠烧瓷为生。本命瓷碎、长生桥断，但从未放弃。',
    bottomLine:'伤他身边的人——你敢动他朋友，他记你一辈子。',
    relationshipTiers:[
      {min:-50,label:'仇敌',desc:'你伤害过他或他在乎的人'},
      {min:-10,label:'陌生人',desc:'萍水相逢'},
      {min:10,label:'相识',desc:'他记住了你的名字'},
      {min:25,label:'朋友',desc:'他愿意为你出力'},
      {min:40,label:'挚友',desc:'他可以为你拼命'},
      {min:60,label:'生死之交',desc:'你的事就是他的事'}
    ],
    // 按关系阶段变化的对话
    dialogues:{
      stranger:['嗯。','你好。','有事吗？'],
      friend:['今天天气不错。','一起去采药？','你最近修炼怎么样？'],
      close:['碎碎平安，岁岁平安。','我记着了。','你的事，我尽力。'],
      intimate:['有你在，我心里踏实些。','别死了。','我答应你的事，一定做到。']
    },
    // 情感反应
    reactions:{
      help:'认真听完，然后默默去做，做到了也不邀功。',
      trust:'他点点头，眼神里多了一些温度。',
      betray:'他什么都没说，但你再也走不进他的世界了。',
      protect:'他挡在你面前："退后，我来。"',
      give:'愣住，确认"真的给我？"然后认真鞠躬："谢谢，我记着了。"'
    },
    // 专属情感事件
    emotionalEvents:[
      {id:'cp_share',text:'陈平安递给你半个馒头："你饿了吧。"',req:10,bonus:{daoHeart:2}},
      {id:'cp_fight',text:'陈平安擦了擦嘴角的血："打完了？那我先走了。"',req:20,bonus:{daoHeart:3}},
      {id:'cp_watch',text:'陈平安在月光下练拳，一拳一拳，不知疲倦。你看了一整夜。',req:30,bonus:{swordIntent:2,daoHeart:3}},
      {id:'cp_promise',text:'陈平安看着你的眼睛："我答应你的事，一定做到。"',req:40,bonus:{daoHeart:5}},
      {id:'cp_save',text:'危急时刻，陈平安挡在你面前："退后，我来。"',req:50,bonus:{daoHeart:8,merit:5}},
      {id:'cp_farewell',text:'陈平安背对着你，声音很轻："路上小心。"',req:60,bonus:{daoHeart:10}}
    ]
  },
  
  ningyao: {
    name:'宁姚', id:'ningyao',
    fullName:'宁姚', nickname:'宁姚',
    title:'剑气长城嫡传→五彩天下第一人',
    appearance:'一身黑衣，腰悬短剑，眼神冷冽如剑锋',
    personality:'外冷内热，直得像剑，每一句都是真的。滴水之恩，涌泉相报。',
    background:'剑气长城嫡传血脉，背负守护人族的重任。重伤坠入骊珠洞天，被陈平安所救。',
    bottomLine:'骗她——你骗她一次，她这辈子都不会再信你。',
    relationshipTiers:[
      {min:-50,label:'死敌',desc:'你触犯了她的底线'},
      {min:-10,label:'路人',desc:'她懒得看你一眼'},
      {min:10,label:'相识',desc:'她记住了你的名字'},
      {min:25,label:'可信',desc:'她愿意和你说话'},
      {min:40,label:'知己',desc:'她可以为你出剑'},
      {min:60,label:'生死',desc:'她可以为你去死'}
    ],
    dialogues:{
      stranger:['嗯。','有事？','跟我有什么关系？'],
      friend:['去练剑。','你太弱了。','还行。'],
      close:['我宁姚处世，滴水之恩，涌泉相报。','别死了。','你……还算可以。'],
      intimate:['我在五彩天下等你。','若我迷失在光阴长河，这剑鞘会带你找到我。','原来我们的因果，早在那件血衣相遇时就已注定。']
    },
    reactions:{
      help:'皱眉："我不需要。"（但如果你坚持，她会收下，嘴上说"多事"）',
      trust:'她没说话，但剑鞘往你那边挪了挪。',
      betray:'她拔剑，眼神冷得像万年寒冰："你再说一遍。"',
      protect:'剑光一闪，她已经站在你和敌人之间。',
      give:'她看着你，难得地笑了一下："多事。"但收下了。'
    },
    emotionalEvents:[
      {id:'ny_meet',text:'宁姚靠在墙边，浑身是血，却还倔强地站着。',req:5,bonus:{daoHeart:2}},
      {id:'ny_sword',text:'宁姚在月色下练剑，剑光如霜。你远远看着，不敢出声。',req:15,bonus:{swordIntent:3}},
      {id:'ny_trust',text:'宁姚忽然开口："你……叫什么名字？"',req:25,bonus:{daoHeart:3}},
      {id:'ny_gift',text:'宁姚扔给你一个东西："拿着，别弄丢了。"是一枚剑鞘。',req:35,bonus:{daoHeart:5,item:'sword_sheath'}},
      {id:'ny_protect',text:'宁姚挡在你身前，剑指强敌："退后，这个人，我保了。"',req:45,bonus:{daoHeart:8,merit:5}},
      {id:'ny_farewell',text:'宁姚转身，背对着你说："我在五彩天下等你。"',req:55,bonus:{daoHeart:10,swordIntent:5}},
      {id:'ny_return',text:'宁姚回来了。她站在泥瓶巷口，还是一身黑衣，腰间挂着那柄短剑。',req:65,bonus:{daoHeart:15}}
    ]
  },
  
  qijingchun: {
    name:'齐静春', id:'qijingchun',
    fullName:'齐静春', nickname:'齐先生',
    title:'儒家圣人，小镇学塾先生',
    appearance:'温润如玉的青衫儒士，手持书卷，含笑而立',
    personality:'春风化雨，温润如玉。讲道理讲到人心服口服。',
    background:'文圣一脉，十四境大修士。坐镇骊珠洞天，护小镇六千百姓。',
    bottomLine:'小镇六千百姓——谁敢动他们，他拼了命也要护住。',
    dialogues:{
      stranger:['来了？坐。','今日讲《论语》。'],
      friend:['君子不器。','遇事不决，可问春风。'],
      close:['道理我都讲了，路要你自己走。','愿少年，乘风破浪，他日勿忘化雨功。'],
      intimate:['我这一生，最得意的事，是在这座小镇教了几年书。']
    },
    reactions:{
      ask:'放下书卷，认真听你说完，然后给你讲道理。',
      thank:'含笑点头："嗯。好好修行。"',
      farewell:'他站在学塾门口，目送你走远。'
    },
    emotionalEvents:[
      {id:'qj_teach',text:'齐静春讲完一节课，走到你身边："有什么不懂的？"',req:5,bonus:{wuxing:2}},
      {id:'qj_spring',text:'齐静春望着窗外："春风来了。你感觉到了吗？"',req:15,bonus:{daoHeart:3}},
      {id:'qj_advice',text:'齐静春看着你，温声道："遇事不决，可问春风。"',req:25,bonus:{daoHeart:5}},
      {id:'qj_farewell',text:'齐静春站在春风里，身影渐渐消散："愿少年，乘风破浪，他日勿忘化雨功。"',req:35,bonus:{daoHeart:10,merit:10}}
    ]
  },
  
  liushenyang: {
    name:'刘羡阳', id:'liushenyang',
    fullName:'刘羡阳', nickname:'羡阳',
    title:'龙窑学徒→玉璞剑仙',
    appearance:'大嗓门，笑起来露出一口白牙',
    personality:'万事不上心，胆大妄为。对兄弟掏心掏肺。',
    background:'陈平安的师兄，天赋极高。被搬山猿重伤后苦修剑经，终成玉璞。',
    bottomLine:'背叛兄弟——他这辈子最恨的就是背信弃义。',
    dialogues:{
      stranger:['嘿！','走走走！','来来来！'],
      friend:['包在我身上！','够意思！','冲啊！'],
      close:['陈平安的事就是我的事。','你也是我兄弟。','有我在，没事！']
    },
    emotionalEvents:[
      {id:'lx_meet',text:'刘羡阳大笑着拍你的肩膀："走，请你吃包子！"',req:5,bonus:{}},
      {id:'lx_fight',text:'刘羡阳被打得浑身是血，却还在笑："嘿，我还没死呢……"',req:15,bonus:{daoHeart:3}},
      {id:'lx_revenge',text:'刘羡阳站在正阳山废墟上，看着搬山猿的尸体，沉默了很久。',req:30,bonus:{daoHeart:8,merit:5}}
    ]
  },
  
  rusheng: {name:'陆沉',id:'rusheng',fullName:'陆沉',nickname:'陆沉',title:'嬉皮笑脸的十四境大修士',appearance:'头戴莲花冠的年轻道士，嬉皮笑脸',personality:'玩世不恭，每句玩笑话背后都有深意',background:'十四境道童天君，全书最顶级的操盘手',dialogues:{stranger:['小友！','算命吗？三文！','命里八尺，莫求一丈。'],friend:['有意思，真有意思。','你这个人，有点意思。','别死了，我还想看你走到哪一步。']},emotionalEvents:[{id:'ls_fortune',text:'陆沉笑眯眯地看着你："你身上有股老朋友的气息。"',req:5,bonus:{wuxing:1}},{id:'ls_advice',text:'陆沉难得正经了一次："有些路，只能一个人走。"',req:20,bonus:{daoHeart:3}}]},
  yanglaotou: {name:'杨老头',id:'yanglaotou',fullName:'杨老头',nickname:'杨老头',title:'药铺老板，远古神灵',appearance:'坐在竹椅上抽旱烟的老头',personality:'市井功利，话里有话，深不可测',background:'活了不知多少年的远古神灵，守着杨家药铺',dialogues:{stranger:['来啦？','拿药？','忍着。'],friend:['嗯。','今晚别去镇口。','你爹当年也不听。']},emotionalEvents:[{id:'yt_warn',text:'杨老头吐了口烟："今晚别去镇口。"',req:5,bonus:{}},{id:'yt_secret',text:'杨老头看着你，忽然说了一句莫名其妙的话："你身上有东西。"',req:20,bonus:{daoHeart:2}}]},
  gucan: {name:'顾璨',id:'gucan',fullName:'顾璨',nickname:'顾璨',title:'泥瓶巷的鼻涕虫',appearance:'脏兮兮的小孩，满口脏话',personality:'满口脏话，机警狡黠，对陈平安如父',background:'泥瓶巷的孤儿，刘志茂收为弟子，两袋金精铜钱留给陈平安',dialogues:{stranger:['干嘛？','滚！','你谁啊？'],friend:['包在我身上！','……谢了。','你比那个宋集薪好。']},emotionalEvents:[{id:'gc_share',text:'顾璨脏兮兮的手里递过来一条烤黄鳝："吃不吃？"',req:5,bonus:{}},{id:'gc_leave',text:'顾璨被刘志茂带走，回头看了你一眼，什么都没说。',req:15,bonus:{daoHeart:3}}]},
  ruanxiu: {name:'阮秀',id:'ruanxiu',fullName:'阮秀',nickname:'阮秀',title:'铁匠铺姑娘，火神转世',appearance:'温柔安静的姑娘，围着围裙',personality:'温柔含蓄，话不多但每句都有分量',background:'铁匠铺阮师傅的女儿，体内沉睡着火神之力',dialogues:{stranger:['嗯？','来了？','好。'],friend:['不用谢。','加油。','嗯。']},emotionalEvents:[{id:'rx_cake',text:'阮秀塞给你一块桂花糕："吃吧，刚蒸的。"',req:5,bonus:{}},{id:'rx_fire',text:'阮秀看着炉火，忽然说："有时候，我觉得自己身体里有火在烧。"',req:20,bonus:{daoHeart:3}}]},
  ailian: {name:'阿良',id:'ailian',fullName:'阿良',nickname:'阿良',title:'剑气长城剑仙',appearance:'背剑的汉子，好酒',personality:'豪爽仗义，剑术通神',dialogues:{stranger:['喝酒去？','看好了！','来，切磋。'],friend:['好酒！','你小子不错。','有我在，放心。']},emotionalEvents:[{id:'al_drink',text:'阿良扔给你一壶酒："喝！"',req:5,bonus:{body:1}},{id:'al_sword',text:'阿良拔剑，剑光如虹："看好了，这一剑我只教一次。"',req:20,bonus:{swordIntent:5}}]},
  songjixin: {name:'宋集薪',id:'songjixin',fullName:'宋集薪',nickname:'宋集薪',title:'泥瓶巷富家少年',appearance:'锦衣少年，神情倨傲',personality:'阴阳怪气，半真半假，嘲讽中藏自卑',dialogues:{stranger:['哟，是你。','随便。','关我什么事？'],friend:['……行吧。','嗯。','你这个人，倒也不讨厌。']},emotionalEvents:[{id:'sj_meet',text:'宋集薪斜眼看你："哟，还活着呢。"',req:5,bonus:{}},{id:'sj_secret',text:'宋集薪难得没有嘲讽："你知道这座小镇……要变天了吗？"',req:15,bonus:{wuxing:1}}]}
};

// 地点
const LOCATIONS = {
  nipingxiang:{name:'泥瓶巷',acl:'小镇陋巷。青砖黑瓦，屋檐低矮。陈平安的家就在这里，对面是顾璨家的破院子。',chars:['chenpingan','songjixin','gucan'],minRealm:0},
  academy:{name:'学塾',acl:'齐静春讲书之所。书声琅琅，窗外偶尔传来镇上喧闹。学塾里还摆着先生的书桌。',chars:['qijingchun'],minRealm:0},
  blacksmith:{name:'铁匠铺',acl:'炉火不熄。阮师傅的打铁声，叮叮当当，从早响到晚。',chars:['ruanxiu','liushenyang'],minRealm:0},
  pharmacy:{name:'杨家药铺',acl:'药香弥漫。杨老头坐在竹椅上，烟袋锅子一明一灭。',chars:['yanglaotou'],minRealm:0},
  town_gate:{name:'镇口',acl:'老槐树下。三千年风雨，树身裂纹如大地写的字。',chars:['rusheng'],minRealm:0},
  mountain_temple:{name:'山神庙',acl:'塌了半边的古庙。月光从破洞照进来，照在菩萨金身上。',chars:[],minRealm:0},
  sword_wall:{name:'剑气长城',acl:'万里长城横亘于天地之间。城墙上每一块砖石都浸透了剑修的鲜血。',chars:['ningyao','ailian'],minRealm:3},
  lake:{name:'书简湖',acl:'水天一色。湖面上漂浮着无数古简，记载着失传的功法。',chars:[],minRealm:4},
  lotus:{name:'藕花福地',acl:'荷花盛开，仙气缭绕的小世界。灵气充沛，适合闭关。',chars:[],minRealm:3},
  barbarian:{name:'蛮荒天下',acl:'妖族领地。大妖巡游，天地变色。',chars:[],minRealm:5},
  shuyang:{name:'肃阳书院',acl:'浩然天下四大书院之一。藏书万卷，儒修圣地。',chars:[],minRealm:2}
};

// 剧情事件
const STORY_EVENTS = {
  vol1: [
    {id:'v1e1',step:1,title:'二月二·龙抬头',location:'nipingxiang',
      narration:'二月二，龙抬头。暮色里，泥瓶巷的僻静处，有位孤苦伶仃的清瘦少年，正手持蜡烛和桃枝，照耀房梁墙壁，驱赶蛇蝎蜈蚣，嘴里念念有词——"二月二，烛照梁，桃打墙，人间蛇虫无处藏。"\n少年姓陈，名平安，爹娘早逝。',
      dialogues:[{speaker:'旁白',content:'小镇的瓷器极负盛名，但如今官窑已被勒令关闭。十四岁的陈平安被扫地出门，回到泥瓶巷的老宅。家徒四壁，少年想当败家子也无从下手。'}],
      choices:[{text:'继续守夜',hint:'仰望星空',risk:''},{text:'出门去骑龙巷',hint:'碰碰运气',risk:''},{text:'自由行动',hint:'做你想做的事',risk:''}]},
    {id:'v1e2',step:2,title:'小镇开门',location:'town_gate',
      narration:'小镇的平静被打破了。镇口的老槐树下，突然涌入了大量外乡人——有白衣胜雪的女修蔡金简，有高冠大袖的锦衣公子，还有一座会移动的山般高大的搬山猿。',
      dialogues:[{speaker:'陆沉',content:'（嬉皮笑脸地凑过来）小友，算命吗？三文钱！不能再少了！'},{speaker:'旁白',content:'这个头戴莲花冠的年轻道士，日后你才知道，竟是十四境的大修士。'}],
      choices:[{text:'花三文钱算命',hint:'听听他说什么',risk:'可能是坑'},{text:'观察外乡人',hint:'打探情报',risk:''},{text:'去找陈平安',hint:'',risk:''}]},
    {id:'v1e3',step:3,title:'长生桥断',location:'nipingxiang',
      narration:'蔡金简踩上了一坨狗屎——这是刘志茂暗中设下的局。她勃然大怒，一掌拍向陈平安，将他的长生桥生生打断。\n"你最多只剩半年时间，就要死了。"\n少年倒在地上，嘴角渗血，却一声不吭。',
      dialogues:[{speaker:'陈平安',content:'（默默擦掉嘴角的血，站起身来）你打完了？那我先走了。'},{speaker:'齐静春',content:'（出现在巷口，温声道）遇事不决，可问春风。'}],
      choices:[{text:'扶起陈平安',hint:'帮他寻药',risk:''},{text:'去找齐静春',hint:'求先生指点',risk:''},{text:'记住蔡金简的脸',hint:'',risk:''}],
      special:{daoHeart:3,demon:2}},
    {id:'v1e4',step:4,title:'宁姚入镇',location:'nipingxiang',
      narration:'一个浑身是血的黑衣少女，被陆沉背到了陈平安家门口。\n她叫宁姚，剑气长城嫡传，被正阳山护山供奉搬山猿追杀，重伤坠入小镇。\n陈平安二话不说，腾出了自己唯一的床铺。',
      dialogues:[{speaker:'宁姚',content:'（虚弱但倔强地看着陈平安）我宁姚处世为人，滴水之恩，涌泉相报。'},{speaker:'陈平安',content:'（端来一碗水）你先喝了。'}],
      choices:[{text:'帮忙送药',hint:'她会记住你的恩情',risk:''},{text:'向她请教剑法',hint:'她先看你人品正不正',risk:'中'},{text:'在门外守着',hint:'防止搬山猿追来',risk:''}],
      special:{daoHeart:3}},
    {id:'v1e5',step:5,title:'春风化雨',location:'academy',
      narration:'学塾的窗开着。齐静春手持书卷，正在讲《论语》。\n"君子不器。"\n他放下书卷，看向窗外很远的地方，温声道："路要你自己走。遇事不决，可问春风。"\n那一刻，春风拂过学塾，吹动了先生的书页。',
      dialogues:[{speaker:'齐静春',content:'我齐静春，在此小镇教书育人，不过是想让这些孩子，多懂一些道理。道理我都讲了，路要你自己走。'}],
      choices:[{text:'认真听课',hint:'提升悟性',risk:''},{text:'问先生修行之事',hint:'求教',risk:''},{text:'问小镇为何开门',hint:'探听秘密',risk:'先生未必会说'}],
      special:{daoHeart:5,wuxing:2}},
    {id:'v1e6',step:6,title:'搬山猿之祸',location:'blacksmith',
      narration:'正阳山护山供奉——搬山猿，寿逾千年的玉璞境大妖，为夺刘家祖传剑经，一拳将刘羡阳打得重伤垂死。\n陈平安冲上去，也被一拳打飞。\n那个大妖俯视着地上的两人，如看蝼蚁。',
      dialogues:[{speaker:'搬山猿',content:'（不屑地）蝼蚁。'},{speaker:'刘羡阳',content:'（躺在血泊中，扯出一个笑）嘿……陈平安，我还没死呢……'},{speaker:'陈平安',content:'（咬着牙，把刘羡阳拖到墙角）闭嘴，别说话。'}],
      choices:[{text:'拼死救刘羡阳',hint:'兄弟情义',risk:'极高'},{text:'去找齐静春',hint:'求援',risk:''},{text:'记下这笔仇',hint:'君子报仇十年不晚',risk:''}],
      special:{body:1,demon:3,story:'save_liu'}},
    {id:'v1e7',step:7,title:'圣人三脚',location:'town_gate',
      narration:'搬山猿不知死活，竟敢在骊珠洞天放肆，甚至想强行搬走披云山。\n齐静春出手了。\n堂堂儒家圣人，三脚踩下——\n第一脚碎了他护体罡气，\n第二脚断了他一条手臂，\n第三脚直接将他踩进地底。\n"在骊珠洞天，还轮不到你放肆。"',
      dialogues:[{speaker:'齐静春',content:'（拍了拍袍子上不存在的灰尘，转头对陈平安温和一笑）没事了。'},{speaker:'搬山猿',content:'（从坑里爬出来，狼狈逃窜）齐静春！你等着！'}],
      choices:[{text:'扶起刘羡阳',hint:'送他去疗伤',risk:''},{text:'向齐静春道谢',hint:'',risk:''},{text:'记住搬山猿的脸',hint:'这个仇，以后亲自报',risk:''}],
      special:{daoHeart:5,merit:10}},
    {id:'v1e8',step:8,title:'春风辞',location:'academy',
      narration:'骊珠洞天三千年天道法运转到尽头。齐静春以一己之躯化作屏障，护住小镇六千百姓。\n春风拂过，先生的身影消散在天地之间。\n"愿少年，乘风破浪，他日勿忘化雨功。"\n小镇六千百姓，无一人伤亡。但那个温润如玉的先生，再也回不来了。',
      dialogues:[{speaker:'齐静春',content:'（最后的声音如春风般温和）陈平安，记住——遇事不决，可问春风。'},{speaker:'旁白',content:'六千百姓跪了一地。有人放声大哭，有人默默磕头。陈平安站在学塾门口，一动不动。'}],
      choices:[{text:'跪拜送别',hint:'先生走好',risk:''},{text:'继承先生的教诲',hint:'此生不忘化雨功',risk:''},{text:'守在学塾外',hint:'最后一程',risk:''}],
      special:{daoHeart:10,merit:20}},
    {id:'v1e9',step:9,title:'剑鞘别离',location:'town_gate',
      narration:'宁姚伤势渐愈，要回剑气长城了。\n她站在镇口老槐树下，还是一身黑衣，腰间挂着一柄短剑。\n"我走了。"\n她看了陈平安一眼，转身离去。\n走了几步，又回头，把一个东西扔过来。\n"别死了。"\n那是一枚剑鞘，入手冰凉。',
      dialogues:[{speaker:'宁姚',content:'（背对着他，声音很轻）我在剑气长城等你。'},{speaker:'陈平安',content:'（握紧剑鞘）我一定去。'}],
      choices:[{text:'目送她离开',hint:'',risk:''},{text:'喊一声"我会去找你"',hint:'承诺',risk:''},{text:'握紧剑鞘',hint:'',risk:''}],
      special:{daoHeart:5,swordIntent:3}},
    {id:'v1e10',step:10,title:'少年出山',location:'nipingxiang',
      narration:'小镇的格局已经变了。骊珠洞天坠地，化为骊珠福地。\n陈平安背着行囊，走出泥瓶巷。\n他要护送李宝瓶去山崖书院，也要去寻找自己的路。\n身后，小镇的炊烟袅袅升起。前方，天地广阔，万物生长。\n他回头看了一眼——泥瓶巷的青砖黑瓦，学塾的方向，似乎还能听见齐先生的声音——\n"遇事不决，可问春风。"',
      dialogues:[{speaker:'旁白',content:'少年转过身，大步向前。春风拂过他的衣角。'}],
      choices:[{text:'踏上征程',hint:'前往山崖书院',risk:''},{text:'先去剑气长城',hint:'找宁姚',risk:'路远'},{text:'自由闯荡',hint:'天地之大任我行',risk:''}],
      special:{body:2,qi:2}}
  ],
  vol2: [
    {id:'v2e1',step:11,title:'万里寻剑',location:'sword_wall',
      narration:'陈平安一路跋涉，终于来到了传说中的剑气长城。\n万里长城，横亘于天地之间。城墙上每一块砖石都浸透了剑修的鲜血，剑意纵横，如霜如雪。\n他在城头看到了一个熟悉的身影——黑衣，短剑，站在城墙最险处，风吹起她的衣角。\n宁姚。\n她回头，看到了他。\n什么都没说，但嘴角微微上扬。',
      dialogues:[{speaker:'宁姚',content:'（看了他很久）你来了。'},{speaker:'陈平安',content:'嗯。我说过会来找你。'}],
      choices:[{text:'并肩而立',hint:'看长城日落',risk:''},{text:'问她在剑气长城过得如何',hint:'关心',risk:''},{text:'开始在剑气长城修炼',hint:'',risk:''}],
      special:{daoHeart:5}},
    {id:'v2e2',step:12,title:'蛮荒之战',location:'sword_wall',
      narration:'蛮荒妖族大举攻城。天地变色，数千妖族修士涌向剑气长城。\n宁姚与陈平安并肩而战，共守城头。"霓裳"与"十五"双剑合璧，剑光如月华倾泻，硬撼妖族飞升境大妖离真。\n血战中，宁姚的剑袍被妖火焚毁半幅，却以冰魄剑气凝结寒霜为甲，护住陈平安后背空门。',
      dialogues:[{speaker:'宁姚',content:'（剑袍染血，语气却平静）你活着，剑气长城便不算输。'},{speaker:'陈平安',content:'（握紧手中剑）你不会死。我也不会。'}],
      choices:[{text:'冲杀在前',hint:'正面迎敌',risk:'高'},{text:'与宁姚相互掩护',hint:'配合',risk:'中'},{text:'指挥守城',hint:'谋略',risk:'中'}],
      special:{swordIntent:5,body:3,merit:10}},
    {id:'v2e3',step:13,title:'末代隐官',location:'sword_wall',
      narration:'陈平安在剑气长城立下赫赫战功，被推举为末代隐官。\n这个职位，在剑气长城的历史上，只传承了不到十人。\n他坐在城头最高的位置，俯瞰整座长城。\n"总有一天，我会让这座长城不再需要隐官。"',
      dialogues:[{speaker:'宁姚',content:'（站在他身侧，难得地笑了笑）陈隐官，这位置可不轻松。'},{speaker:'陈平安',content:'比泥瓶巷的少年强。'},{speaker:'宁姚',content:'那当然。'}],
      choices:[{text:'在城墙上刻字',hint:'刻下"平安"二字',risk:''},{text:'俯瞰长城',hint:'记住这一刻',risk:''},{text:'开始修炼',hint:'',risk:''}],
      special:{swordIntent:5,qi:3}},
    {id:'v2e4',step:14,title:'宁姚开天眼',location:'sword_wall',
      narration:'为了助陈平安突破长生桥桎梏，宁姚以剑气长城秘术"斩因果"强行开天眼。\n此术需割裂自身神魂为引。她瞒着陈平安，在月圆之夜独闯光阴长河，以霓裳剑斩断三缕命线为代价，窥见未来一线生机。\n天眼开启时，陈平安的瞳孔中映出宁姚消散的虚影，才知她为此刻已背负百年反噬之苦。',
      dialogues:[{speaker:'宁姚',content:'（脸色苍白如纸，却笑着）原来我们的因果，早在那件血衣相遇时就已注定。'},{speaker:'陈平安',content:'（扶住她，声音发颤）你疯了……为什么要瞒着我？'},{speaker:'宁姚',content:'因为告诉你，你肯定不会让我做。'}],
      choices:[{text:'紧紧抱住她',hint:'心疼',risk:''},{text:'说"我会变强，绝不再让你受伤"',hint:'承诺',risk:''},{text:'以剑立誓',hint:'此生必护她周全',risk:''}],
      special:{daoHeart:10,rootbone:3,swordIntent:3}},
    {id:'v2e5',step:15,title:'合道长城',location:'sword_wall',
      narration:'陈平安与半截剑气长城合道。\n天地轰鸣，剑气长城迸发出万丈光芒。\n从此，他就是这座长城的一部分，长城就是他的一部分。\n飞升境的瓶颈，在他面前轰然破碎。\n归真境武夫，玉璞境剑修，与半截剑气长城合道——实力足以与飞升境修士抗衡。',
      dialogues:[{speaker:'旁白',content:'从泥瓶巷的穷少年，到剑气长城的合道者。这条路，他走了二十八年。'}],
      choices:[{text:'感受合道之力',hint:'实力暴涨',risk:''},{text:'去找宁姚',hint:'把好消息告诉她',risk:''},{text:'闭关稳固境界',hint:'',risk:''}],
      special:{body:5,qi:5,swordIntent:5}},
    {id:'v2e6',step:16,title:'宁姚飞升',location:'sword_wall',
      narration:'宁姚要飞升五彩天下了。\n她在剑气长城废墟独坐七日，以指尖剑气在残垣刻下"平安"二字，每一笔都渗入本命精血。\n当陈平安赶到时，她白衣染血，站在断剑之上。\n"若我迷失在光阴长河，这剑鞘会带你找到我。"\n话音未落，飞升光柱已将她吞没，唯留一滴冰魄泪坠入陈平安掌心。',
      dialogues:[{speaker:'宁姚',content:'（最后的声音从光柱中传来）我在五彩天下等你。'},{speaker:'陈平安',content:'（握紧手中的剑鞘，声音沙哑）我一定去。'}],
      choices:[{text:'收集她留下的剑气',hint:'留作念想',risk:''},{text:'开始准备飞升',hint:'',risk:''},{text:'在城墙上刻字回应',hint:'刻下"等我"',risk:''}],
      special:{daoHeart:10,swordIntent:5}},
    {id:'v2e7',step:17,title:'问剑正阳山',location:'sword_wall',
      narration:'二十八年了。\n陈平安终于等到了这一天。\n他带着落魄山群雄，问剑正阳山。\n刘羡阳从山脚开始登山，七步踏碎山门。\n陈平安化身青衫客，在祖师堂外喝茶——然后，两剑劈塌了正阳山祖师堂。\n宗主竹皇当场道心崩碎，倒地不起。\n搬山猿冲出来，看到陈平安，脸色大变。',
      dialogues:[{speaker:'搬山猿',content:'（脸色惨白）是你！'},{speaker:'陈平安',content:'（放下茶碗，站起身来）二十八年了。这一剑，是替刘羡阳还的。'},{speaker:'宁姚',content:'（剑光从极远处递来，斩断搬山猿一条手臂）这一剑，是替我自己还的。'}],
      choices:[{text:'一剑斩出',hint:'了结恩怨',risk:''},{text:'让刘羡阳亲自动手',hint:'他的仇他报',risk:''},{text:'废其修为',hint:'让他生不如死',risk:'心魔'}],
      special:{swordIntent:10,merit:10,story:'revenge_done'}},
    {id:'v2e8',step:18,title:'剑来',location:'sword_wall',
      narration:'新天庭之战。陈平安面对远古天庭的残存势力，拔剑而起。\n"天道崩塌——\n我陈平安，唯有一剑，\n可搬山，倒海，降妖，镇魔，\n敕神，摘星，断江，摧城，\n开天！"\n那一剑的风采，天地为之失色。万年之后，还有人记得那个从泥瓶巷走出的少年，那一剑的名字——叫"剑来"。',
      dialogues:[{speaker:'旁白',content:'剑光闪过，天地重新归于寂静。\n陈平安站在废墟之上，手中剑还在微微发颤。\n他赢了。'}],
      choices:[{text:'斩出这一剑',hint:'开天辟地',risk:''},{text:'与宁姚并肩',hint:'最后一战',risk:''},{text:'守护天下苍生',hint:'不负先生教诲',risk:''}],
      special:{daoHeart:10,merit:30,story:'final_battle'}},
    {id:'v2e9',step:19,title:'当归',location:'nipingxiang',
      narration:'一切都结束了。\n陈平安回到了泥瓶巷。\n青砖黑瓦还是老样子，只是巷口的槐树更高了。\n他坐在门槛上，看着夕阳。\n身边，有人递给他一碗水。\n他接过，喝了一口。\n很甜。\n"回来了？"\n"嗯，回来了。"\n春风拂过泥瓶巷，吹起了他的衣角。\n远处，仿佛传来齐先生的声音——\n"遇事不决，可问春风。"\n他笑了笑。\n这一生，不负先生教诲，不负心中所爱，不负天下苍生。',
      dialogues:[{speaker:'宁姚',content:'（坐在他身边，看着夕阳）以后不走了？'},{speaker:'陈平安',content:'不走了。就在这里。'}],
      choices:[{text:'享受这片刻宁静',hint:'值得',risk:''},{text:'去给齐先生上炷香',hint:'不忘师恩',risk:''},{text:'握紧宁姚的手',hint:'',risk:''}],
      special:{daoHeart:15,merit:20,story:'ending'}}
  ]
};

// ==================== 主引擎 ====================
const Engine = {
  state: null,
  
  createNewGame: function(opts) {
    // 初始化所有角色情感状态
    const chars = {};
    for(let cid in CHARACTERS) {
      chars[cid] = {
        disposition: CHARACTERS[cid].id === 'chenpingan' ? 40 : 20,
        memories: [],
        eventsDone: [],
        lastInteraction: 0
      };
    }
    return {
      name: opts.name || '无名修士',
      mode: opts.story ? 'story' : 'free',
      path: opts.story ? 'body' : (opts.path || 'sword'),
      location: 'nipingxiang',
      time: 6, weather: 'clear', day: 1,
      stats: { body:5, qi:5, swordIntent:2, wuxing:5, rootbone:5,
        daoHeart:50, demon:0, merit:0, sin:0, hp:100, hpMax:100, money:100 },
      realm: { qi:0, body:0, sword:0, mainRealm:0 },
      skills: ['buxu','quanshu'],
      inventory: ['mujian'],
      swords: [], cave: null,
      characters: chars,
      factions: {wenmiao:{name:'文庙',reputation:0},swordwall:{name:'剑气长城',reputation:10},barbarian:{name:'蛮荒天下',reputation:0},mountain20:{name:'山水神灵',reputation:20}},
      flags: {}, sceneCount: 0, storyStep: 0, storyDone: []
    };
  },
  
  init: function(savedState) {
    if(savedState) this.state = savedState; this._playMusic(); return this.state;
  },
  _playMusic: function() {
    if(!this.state) return;
    const {theme,ambient}=AudioEngine.getLocationTheme(this.state.location,this.state.weather);
    AudioEngine.playTheme(theme); AudioEngine.playAmbient(ambient);
  },
  
  getRealmName: function(s) {
    if(!s) s=this.state; if(!s) return '凡人'; const r=s.realm;
    if(s.mode==='story') { if(r.body<=2) return '泥瓶巷少年'; if(r.body<=5) return '武道入门'; if(r.qi>0) return BODY_R[r.body]+'·'+QI_R[r.qi]; return BODY_R[r.body]; }
    if(s.path==='qi') return QI_R[r.qi]; if(s.path==='body') return BODY_R[r.body];
    if(s.path==='sword') return r.qi>0?REALMS.sword.levels[r.sword]+'·'+QI_R[r.qi]:REALMS.sword.levels[r.sword];
    return '凡人';
  },
  getTimeDisplay:function(){const t=['子','丑','寅','卯','辰','巳','午','未','申','酉','戌','亥'],i=['🌙','🌙','🌅','☀️','☀️','☀️','☀️','☀️','🌤','🌤','🌆','🌙'];return i[Math.floor(this.state.time%24/2)]+' '+t[Math.floor(this.state.time%24/2)]+'时'},
  getWeatherDisplay:function(){const w={clear:'☀️晴',cloud:'☁️多云',rain:'🌧雨',snow:'❄️雪',fog:'🌫雾',thunder:'⛈雷'};return w[this.state.weather]||'☀️晴'},
  
  // 获取关系阶段
  getRelationshipTier: function(charId) {
    const c = this.state.characters[charId];
    if(!c) return '陌生人';
    const char = CHARACTERS[charId];
    if(!char) return '陌生人';
    const tiers = char.relationshipTiers;
    for(let i = tiers.length-1; i >= 0; i--) {
      if(c.disposition >= tiers[i].min) return tiers[i].label;
    }
    return '陌生人';
  },
  
  // 获取角色对话（根据关系阶段）
  getCharacterDialogue: function(charId) {
    const c = this.state.characters[charId];
    if(!c) return '……';
    const char = CHARACTERS[charId];
    if(!char) return '……';
    const disp = c.disposition;
    let tier = 'stranger';
    if(disp >= 50) tier = 'intimate';
    else if(disp >= 30) tier = 'close';
    else if(disp >= 15) tier = 'friend';
    const dialogs = char.dialogues[tier] || char.dialogues.stranger;
    return dialogs[Math.floor(Math.random() * dialogs.length)];
  },
  
  // 获取角色情感事件
  getCharacterEmotionalEvent: function(charId) {
    const c = this.state.characters[charId];
    if(!c) return null;
    const char = CHARACTERS[charId];
    if(!char) return null;
    const events = char.emotionalEvents;
    if(!events) return null;
    // 找未触发且满足关系要求的
    for(let ev of events) {
      if(!c.eventsDone.includes(ev.id) && c.disposition >= ev.req) {
        return ev;
      }
    }
    return null;
  },
  
  // 添加记忆
  addMemory: function(charId, event) {
    const c = this.state.characters[charId];
    if(!c) return;
    c.memories.push({text:event, time:this.state.sceneCount});
    if(c.memories.length > 10) c.memories.shift();
  },
  
  // 生成场景
  generateScene: function() {
    const s = this.state;
    s.sceneCount++;
    this.advanceTime();
    this._playMusic();
    
    if(s.mode === 'story') return this._genStoryScene();
    return this._genFreeScene();
  },
  
  _genStoryScene: function() {
    const s = this.state;
    const step = s.storyStep;
    let event = null;
    for(let volKey in STORY_EVENTS) {
      const vol = STORY_EVENTS[volKey];
      const ev = vol.find(e => e.step === step + 1);
      if(ev) { event = ev; break; }
    }
    if(!event) return this._genFreeScene();
    if(s.storyDone.includes(event.id)) return this._genFreeScene();
    
    if(event.location) s.location = event.location;
    if(event.special) {
      const sp = event.special;
      if(sp.daoHeart) s.stats.daoHeart = Math.min(100, s.stats.daoHeart+sp.daoHeart);
      if(sp.merit) s.stats.merit += sp.merit;
      if(sp.body) s.stats.body += sp.body;
      if(sp.qi) s.stats.qi += sp.qi;
      if(sp.swordIntent) s.stats.swordIntent += sp.swordIntent;
      if(sp.rootbone) s.stats.rootbone += sp.rootbone;
      if(sp.demon) s.stats.demon = Math.min(100, s.stats.demon+sp.demon);
      if(sp.story) s.flags[sp.story] = true;
    }
    AudioEngine.playEvent();
    return {narration:event.narration, dialogues:event.dialogues||[], choices:event.choices||[{text:'继续',hint:'',risk:''}], isStoryEvent:true, eventId:event.id};
  },
  
  _genFreeScene: function() {
    const s = this.state;
    const loc = LOCATIONS[s.location];
    const charsHere = Object.keys(s.characters).filter(id => s.characters[id] && CHARACTERS[id] && CHARACTERS[id].location === s.location);
    let narration = loc.acl;
    let dialogues = [];
    
    // 检查是否有角色情感事件
    for(let cid of charsHere) {
      const ev = this.getCharacterEmotionalEvent(cid);
      if(ev) {
        AudioEngine.playEvent();
        return {narration:ev.text, dialogues:[], choices:[{text:'回应他/她',hint:'',risk:''},{text:'默默倾听',hint:'',risk:''}], isEmotional:true, eventId:ev.id, charId:cid};
      }
      // 获取角色对话
      const dial = this.getCharacterDialogue(cid);
      if(dial) dialogues.push({speaker:CHARACTERS[cid].name, content:dial});
    }
    
    let choices = [
      {text:'打坐修炼',hint:'提升修为',risk:''},
      {text:'探索周边',hint:'可能遇到机缘',risk:''},
    ];
    if(charsHere.length > 0) {
      choices.push({text:'与'+CHARACTERS[charsHere[0]].name+'深入交谈',hint:'关系提升',risk:''});
    }
    choices.push({text:'换个地方',hint:'前往其他场景',risk:''});
    choices.push({text:'自由行动',hint:'做任何你想做的事',risk:''});
    
    return {narration, dialogues, choices};
  },
  
  processChoice: function(idx) {
    const s = this.state;
    const scene = this._lastScene;
    if(!scene || !scene.choices[idx]) return null;
    const choice = scene.choices[idx];
    AudioEngine.playChoice();
    
    if(choice.text === '换个地方') return {special:'travel'};
    if(choice.text === '自由行动') return {special:'free'};
    if(choice.text === '打坐修炼') return this._processCultivation();
    if(choice.text === '探索周边') return this._processExplore();
    if(choice.text.includes('深入交谈')) {
      const charsHere = Object.keys(s.characters).filter(id=>s.characters[id]&&CHARACTERS[id]&&CHARACTERS[id].location===s.location);
      if(charsHere.length>0) {
        const cid = charsHere[0];
        s.characters[cid].disposition = Math.min(100, s.characters[cid].disposition + 3);
        this.addMemory(cid, '你主动与他交谈，关系更近了一步。');
        AudioEngine.playLevelUp();
        return {scene:true, narration:'你与'+CHARACTERS[cid].name+'深入交谈，彼此更加了解。关系提升！'};
      }
    }
    
    // 剧情事件推进
    if(scene.isStoryEvent && scene.eventId) {
      s.storyStep++; s.storyDone.push(scene.eventId);
      AudioEngine.playLevelUp();
      return {scene:true, narration:'【剧情推进】'};
    }
    
    // 情感事件回应
    if(scene.isEmotional && scene.charId) {
      const cid = scene.charId;
      s.characters[cid].eventsDone.push(scene.eventId);
      s.characters[cid].disposition = Math.min(100, s.characters[cid].disposition + 5);
      this.addMemory(cid, '你回应了他的情感，你们的关系更加深厚。');
      // 查找事件奖励
      const char = CHARACTERS[cid];
      if(char) {
        const ev = char.emotionalEvents.find(e => e.id === scene.eventId);
        if(ev && ev.bonus) {
          const b = ev.bonus;
          if(b.daoHeart) s.stats.daoHeart = Math.min(100, s.stats.daoHeart+b.daoHeart);
          if(b.swordIntent) s.stats.swordIntent += b.swordIntent;
          if(b.wuxing) s.stats.wuxing += b.wuxing;
          if(b.merit) s.stats.merit += b.merit;
          if(b.item && !s.inventory.includes(b.item)) s.inventory.push(b.item);
        }
      }
      AudioEngine.playLevelUp();
      return {scene:true, narration:'你与他之间的羁绊更深了。'};
    }
    
    return {scene:true};
  },
  
  _processCultivation: function() {
    const s=this.state,r=s.realm; AudioEngine.playTheme('cultivation'); let gains='';
    const doBreak=(cond,succ,fail,da)=>{if(cond){const ok=Math.random()*100<(s.stats.wuxing+s.stats.daoHeart-s.stats.demon);if(ok){succ();AudioEngine.playLevelUp();gains='突破成功！';}else{s.stats.demon=Math.min(100,s.stats.demon+da);AudioEngine.playNegative();gains='突破失败...';}}};
    if(s.path==='qi') doBreak(r.qi<QI_R.length-1,()=>{r.qi++;s.stats.qi+=3;gains='现在是'+QI_R[r.qi];},3);
    else if(s.path==='body') doBreak(r.body<BODY_R.length-1,()=>{r.body++;s.stats.body+=3;s.stats.hpMax+=20;gains='现在是'+BODY_R[r.body];},2);
    else if(s.path==='sword') doBreak(r.sword<REALMS.sword.levels.length-1,()=>{r.sword++;s.stats.swordIntent+=5;gains='现在是'+REALMS.sword.levels[r.sword];},4);
    r.mainRealm=Math.max(r.qi,r.body,r.sword); s.stats.hp=Math.min(s.stats.hpMax,s.stats.hp+20); this._playMusic();
    return{scene:true,narration:'你闭目打坐，灵气运转周天。'+gains};
  },
  
  _processExplore: function() {
    const r=Math.random(); const s=this.state;
    if(r<0.3){s.stats.money+=50;return{scene:true,narration:'你逛了逛，发现了一些值钱的东西（+50铜钱）。'};}
    if(r<0.6){s.stats.daoHeart=Math.min(100,s.stats.daoHeart+2);return{scene:true,narration:'你在一处山崖边静坐，对天道有所感悟（道心+2）。'};}
    AudioEngine.playTheme('battle'); return{battle:this._createBattle()};
  },
  
  _createBattle: function() {
    const s=this.state,enemies=[{name:'山野妖兽',hp:60,hpMax:60,power:10},{name:'鬼修',hp:80,hpMax:80,power:12},{name:'妖道',hp:100,hpMax:100,power:15}];
    if(s.storyStep>=10) enemies.push({name:'搬山猿残影',hp:200,hpMax:200,power:25});
    const enemy={...enemies[Math.floor(Math.random()*enemies.length)]}; enemy.hp=enemy.hpMax;
    return{title:'遭遇战斗：'+enemy.name,enemy,myHp:s.stats.hp,myHpMax:s.stats.hpMax,finished:false,actions:[{name:'出手攻击',type:'attack'},{name:'使用剑术',type:'sword'},{name:'防御',type:'defend'},{name:'逃跑',type:'flee'}]};
  },
  
  battleAction: function(idx) {
    const s=this.state,b=this._currentBattle; if(!b||b.finished) return{battle:b};
    const action=b.actions[idx]; let r={type:'neutral',text:''};
    if(action.type==='attack'){const dmg=15+s.stats.body+Math.floor(Math.random()*10);b.enemy.hp-=dmg;AudioEngine.playSword();r={type:'combat',text:'你出手攻击，造成'+dmg+'点伤害！'};}
    else if(action.type==='sword'){const dmg=20+s.stats.swordIntent+Math.floor(Math.random()*15);b.enemy.hp-=dmg;AudioEngine.playSword();r={type:'combat',text:'你一剑刺出，造成'+dmg+'点伤害！'};}
    else if(action.type==='defend'){AudioEngine.playHit();r={type:'neutral',text:'你摆出防御架势。'};}
    else if(action.type==='flee'){b.finished=true;AudioEngine.playTravel();return{battle:b,type:'escape',text:'你成功撤退了。'};}
    if(b.enemy.hp>0){const ed=b.enemy.power-(action.type==='defend'?5:0);b.myHp-=Math.max(0,ed);r.text+=' '+b.enemy.name+'反击，你受到'+Math.max(0,ed)+'点伤害。';}
    if(b.enemy.hp<=0){b.finished=true;const exp=10+Math.floor(Math.random()*15);s.stats.qi+=exp;AudioEngine.playLevelUp();r={type:'gain',text:'你击败了'+b.enemy.name+'！获得'+exp+'点灵气。'};}
    else if(b.myHp<=0){b.finished=true;b.myHp=1;s.stats.demon=Math.min(100,s.stats.demon+5);AudioEngine.playNegative();r={type:'loss',text:'你重伤败退，心生魔障...'};}
    s.stats.hp=b.myHp;this._playMusic();return{battle:b,type:r.type,text:r.text};
  },
  
  advanceTime: function() {
    const s=this.state; s.time=(s.time+2)%24; if(s.time===0)s.day++;
    const ws=['clear','clear','cloud','rain','fog','clear','thunder'];
    if(Math.random()<0.2)s.weather=ws[Math.floor(Math.random()*ws.length)];
    if(s.stats.daoHeart>50&&s.stats.demon>0&&Math.random()<0.3)s.stats.demon=Math.max(0,s.stats.demon-1);
  },
  
  saveToStorage: function() {
    const saves=JSON.parse(localStorage.getItem('jianlai_saves')||'[]');
    saves.unshift({id:Date.now(),time:new Date().toLocaleString('zh-CN'),data:JSON.parse(JSON.stringify(this.state)),summary:this.state.name+'·第'+(this.state.storyStep||0)+'步'});
    if(saves.length>10)saves.pop(); localStorage.setItem('jianlai_saves',JSON.stringify(saves));
  },
  loadFromStorage: function() {
    const saves=JSON.parse(localStorage.getItem('jianlai_saves')||'[]'); return saves.length>0?saves[0].data:null;
  },
  
  // ============= 面板渲染 =============
  renderStatusPanel: function() {
    const s=this.state; let h='<h3 style="text-align:center;margin-bottom:15px">修士状态</h3>';
    h+='<div style="margin-bottom:6px"><span style="color:var(--ink-gray)">道号：</span>'+s.name+'</div>';
    h+='<div style="margin-bottom:6px"><span style="color:var(--ink-gray)">境界：</span>'+this.getRealmName()+'</div>';
    h+='<div style="margin-bottom:6px"><span style="color:var(--ink-gray)">剧情：</span>第'+s.storyStep+'步/'+(s.mode==='story'?'19':'自由')+'</div></div>';
    const st=s.stats;
    [['body','体魄','#9a4a4a'],['qi','灵气','#4a7a9a'],['swordIntent','剑意','#7a7a7a'],['wuxing','悟性','#6a5a3a'],['rootbone','根骨','#5a7a5a']].forEach(([k,n,c])=>{
      h+='<div style="display:flex;justify-content:space-between;margin-bottom:3px;font-size:0.9rem"><span>'+n+'</span><span style="color:'+c+'">'+st[k]+'</span></div>';
    });
    h+='<div style="margin-top:8px">道心：<div class="stat-bar"><div class="stat-fill dao" style="width:'+st.daoHeart+'%"></div></div></div>';
    h+='<div style="margin-top:4px">心魔：<div class="stat-bar"><div class="stat-fill demon" style="width:'+st.demon+'%"></div></div></div>';
    h+='<div style="margin-top:10px;display:grid;grid-template-columns:1fr 1fr;gap:4px;font-size:0.85rem">';
    h+='<div>功德: <span style="color:var(--ink-green)">'+st.merit+'</span></div><div>罪孽: <span style="color:var(--ink-red)">'+st.sin+'</span></div>';
    h+='<div>生命: '+st.hp+'/'+st.hpMax+'</div><div>金钱: '+st.money+'</div></div>';
    return h;
  },
  renderSkillsPanel: function() {
    let h='<h3 style="text-align:center;margin-bottom:15px">已学功法</h3>';
    const SK={buxu:{name:'吐纳术',desc:'打坐吐纳回复'},quanshu:{name:'长拳架',desc:'拳架近身',power:15},qingjian:{name:'青剑术',desc:'基础剑诀',power:10},feijian:{name:'飞剑出窍',desc:'本命飞剑',power:25},leifu:{name:'五雷符',desc:'天雷轰击',power:35},hufa:{name:'护道符',desc:'护体神光'}};
    this.state.skills.forEach(sk=>{const s=SK[sk];if(s)h+='<div class="card-ink" style="margin-bottom:6px"><div style="font-weight:bold;color:var(--ink-paper)">'+s.name+'</div><div style="font-size:0.8rem;color:var(--ink-gray)">'+s.desc+'</div>'+(s.power?'<div style="font-size:0.75rem;color:var(--ink-light)">威力: '+s.power+'</div>':'')+'</div>';});
    return h;
  },
  renderInventoryPanel: function() {
    const s=this.state; let h='<h3 style="text-align:center;margin-bottom:15px">背包</h3>';
    const SW={mujian:{name:'木剑',desc:'普通木剑'},tiejian:{name:'铁剑',desc:'精铁铸成'},jianpei:{name:'剑胚',desc:'可温养成飞剑'},laojian:{name:'廊桥古剑',desc:'上古剑器'},biming:{name:'本命剑',desc:'以精血孕育'},sword_sheath:{name:'宁姚的剑鞘',desc:'她留给你的信物'},huofu:{name:'火符',desc:'火属性符箓'}};
    s.inventory.forEach(item=>{const sw=SW[item];if(sw)h+='<div style="padding:6px 0;border-bottom:1px solid var(--ink-gray)"><span style="color:var(--ink-paper)">'+sw.name+'</span><span style="font-size:0.8rem;color:var(--ink-gray);margin-left:8px">'+sw.desc+'</span></div>';else h+='<div style="padding:6px 0;border-bottom:1px solid var(--ink-gray)"><span>'+item+'</span></div>';});
    return h;
  },
  renderSocialPanel: function() {
    const s=this.state; let h='<h3 style="text-align:center;margin-bottom:15px">人物关系</h3>';
    for(let cid in CHARACTERS) {
      const ch=CHARACTERS[cid],cs=s.characters[cid]; if(!cs) continue;
      h+='<div class="card-ink" style="margin-bottom:8px">';
      h+='<div style="display:flex;justify-content:space-between;align-items:center"><div><span style="font-size:1rem;color:var(--ink-paper)">'+ch.name+'</span>'+(ch.title?'<span style="font-size:0.7rem;color:var(--ink-gray);margin-left:6px">'+ch.title+'</span>':'')+'</div><span style="font-size:0.8rem;color:'+(cs.disposition>=30?'var(--ink-green)':cs.disposition>=10?'var(--ink-gold)':'var(--ink-gray)')+'">'+this.getRelationshipTier(cid)+' ('+cs.disposition+')</span></div>';
      if(ch.personality) h+='<div style="font-size:0.75rem;color:var(--ink-light);margin-top:4px">性格：'+ch.personality+'</div>';
      if(ch.background) h+='<div style="font-size:0.75rem;color:var(--ink-gray);margin-top:2px">'+ch.background+'</div>';
      if(ch.bottomLine) h+='<div style="font-size:0.7rem;color:var(--ink-red);margin-top:2px">底线：'+ch.bottomLine+'</div>';
      if(cs.memories.length>0) {
        h+='<div style="font-size:0.7rem;color:var(--ink-gray);margin-top:4px;border-top:1px solid rgba(80,80,80,0.2);padding-top:4px">';
        cs.memories.slice(-3).forEach(m=>{h+='<div>• '+m.text+'</div>';});
        h+='</div>';
      }
      h+='</div>';
    }
    return h;
  },
  renderAchievementsPanel: function() {
    const s=this.state; let h='<h3 style="text-align:center;margin-bottom:15px">成就</h3>';
    const achievements=[
      {id:'first',name:'第一步',desc:'开始修行',icon:'👣',check:()=>s.sceneCount>=1},
      {id:'cultivate',name:'初窥门径',desc:'第一次突破',icon:'🌀',check:()=>s.realm.mainRealm>=1},
      {id:'friend',name:'以心交心',desc:'关系达到好友',icon:'🤝',check:()=>{for(let c in s.characters){if(s.characters[c].disposition>=25)return true}return false}},
      {id:'story5',name:'剧情过半',desc:'推进到第5步',icon:'📖',check:()=>s.storyStep>=5},
      {id:'story10',name:'小镇风云',desc:'完成骊珠洞天篇',icon:'🏘️',check:()=>s.storyStep>=10},
      {id:'love',name:'生死之约',desc:'宁姚关系达到知己',icon:'💕',check:()=>s.characters.ningyao&&s.characters.ningyao.disposition>=40},
      {id:'master',name:'剑道宗师',desc:'剑意达到20',icon:'🗡️',check:()=>s.stats.swordIntent>=20},
      {id:'revenge',name:'二十八年',desc:'完成问剑正阳山',icon:'🔥',check:()=>s.flags&&s.flags.revenge_done},
      {id:'final',name:'天道崩塌',desc:'完成新天庭之战',icon:'🌟',check:()=>s.flags&&s.flags.final_battle},
      {id:'ending',name:'当归',desc:'完成全部剧情',icon:'🏠',check:()=>s.flags&&s.flags.ending},
      {id:'heart',name:'剑心澄澈',desc:'道心达到100',icon:'💎',check:()=>s.stats.daoHeart>=100}
    ];
    let unlocked=0;
    achievements.forEach(a=>{const done=a.check();if(done)unlocked++;h+='<div class="achievement-item'+(done?' unlocked':'')+'"><div class="achievement-icon">'+a.icon+'</div><div style="flex:1"><div style="font-weight:bold;font-size:0.9rem;color:'+(done?'var(--ink-gold)':'var(--ink-gray)')+'">'+a.name+'</div><div style="font-size:0.75rem;color:var(--ink-gray)">'+a.desc+'</div></div><div style="font-size:0.8rem;color:'+(done?'var(--ink-green)':'var(--ink-gray)')+'">'+(done?'✅':'🔒')+'</div></div>';});
    h+='<div style="text-align:center;margin-top:10px;font-size:0.85rem;color:var(--ink-gray)">已解锁: '+unlocked+'/'+achievements.length+'</div>';
    return h;
  },
  renderCavePanel: function() {
    let h='<h3 style="text-align:center;margin-bottom:15px">洞府</h3>';
    if(!this.state.cave) h+='<p style="color:var(--ink-gray)">你还没有洞府。<br>探索有机缘获得洞府。</p>'; else h+='<p>洞府等级:'+this.state.cave.tier+'</p>';
    return h;
  },
  renderMapPanel: function() {
    const s=this.state; let h='<h3 style="text-align:center;margin-bottom:12px">大地图</h3><div class="map-grid">';
    Object.keys(LOCATIONS).forEach(locId=>{const loc=LOCATIONS[locId],isC=locId===s.location,isL=s.realm.mainRealm<loc.minRealm;
      h+='<div class="map-cell '+(isC?'current':'')+' '+(isL?'locked':'')+'" onclick="'+(isL||isC?'':"travelTo('"+locId+"')")+'"><div>'+loc.name+'</div>'+(isL?'<div style="font-size:0.7rem;color:var(--ink-red)">🔒</div>':'')+'</div>';});
    h+='</div>';
    if(s.mode==='story') {
      h+='<div style="margin-top:10px;font-size:0.9rem;color:var(--ink-light)">剧情进度</div>';
      h+='<div style="font-size:0.8rem;color:var(--ink-gray);line-height:1.6">';
      for(let vk in STORY_EVENTS) STORY_EVENTS[vk].forEach(ev=>{const done=s.storyDone.includes(ev.id);h+='<div style="padding:2px 0;'+(done?'color:var(--ink-green)':'color:var(--ink-gray)')+'">'+(done?'✅':'⏳')+' '+ev.title+'</div>';});
      h+='</div>';
    }
    return h;
  },
  
  travelTo: function(locId) {
    const s=this.state,loc=LOCATIONS[locId];
    if(!loc||s.realm.mainRealm<loc.minRealm) return;
    AudioEngine.playTravel(); s.location=locId; this._playMusic();
    document.getElementById('panel-overlay').style.display='none';
  },
  freeAction: function(action) {
    AudioEngine.playChoice();
    if(action.includes('练剑')||action.includes('修炼')){this.state.stats.swordIntent+=1;return{scene:true,narration:'你勤修剑术，剑意微增。'};}
    if(action.includes('读书')||action.includes('看书')){this.state.stats.daoHeart=Math.min(100,this.state.stats.daoHeart+2);return{scene:true,narration:'你翻阅典籍，心境提升。'};}
    if(action.includes('行走')||action.includes('游历')){this.state.stats.body+=1;return{scene:true,narration:'你四处行走，体魄微增。'};}
    if(action.includes('闭关')||action.includes('打坐'))return this._processCultivation();
    return{scene:true,narration:'你做了想做的事。'};
  },
  _lastScene: null, _currentBattle: null,
  getLastScene: function(){return this._lastScene}, setLastScene: function(s){this._lastScene=s}
};

window.AudioEngine = AudioEngine;
window.Engine = Engine;

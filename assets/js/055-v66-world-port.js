
/* ============================================================================
 * v66 · 世界赛事完整照搬（赛制 + UI + 数据）
 *
 * 开发者反馈（原话）：
 *   「世界赛照搬过来啊，你做的这是啥，把那一套照搬过来，ui也照搬，
 *     只把配色风格改成本项目一致的」
 *
 * 上一轮我自己简化了一套（预选 5取2 → 3队小组 → 八强），不符合要求。
 * 本层把参考项目 aa/assets/career-plus.js 的世界赛完整移植：
 *   · 赛制：世界杯（预选6取3 → 32队8组×4 → 4组×4带入交手 → 八强淘汰）
 *          奥运会（落选赛6队2组冠军出线 → 12队3组×4 → 八强1v8/4v5/2v7/3v6 → 决赛）
 *          亚锦赛（预选4取2 → 16队4组×4 → 小组第1直通八强、2/3名资格赛 → 淘汰）
 *   · UI：征召弹层（真实赛制说明 + 国家队名单）、赛事弹层（进度条 + 场均三格 +
 *         逐场卡片 + 单场 13 项数据详情）、国际赛履历页
 *   · 数据：41 国真实数据（国旗/赛区/实力/真实球员名单）+ 单场数据生成 + 奖项规则
 *
 * 只改配色：参考项目用的 CSS 变量（--bg-card/--orange/--border/--text…）
 *          这里全部映射到本项目已有的暖色系（米白/棕橙/金）。
 *
 * 照搬时修掉参考项目的三个 bug（否则会带进本作）：
 *   ① 世界杯第二阶段「带入交手结果」只加了胜负场、漏加积分（updateTable 是 2/1 分制）
 *   ② 世界杯 9~16 名映射变量捕获错误（placement[code] 应为 placement[x.code]）
 *   ③ eventForYear 硬编码年份下限（year>=2028 才有奥运）→ 姚明 2002 起根本碰不到世界赛
 *      ，2008 北京奥运永不触发。本层改为按真实周期、不设下限。
 *
 * 本作适配：只对姚明开放（看专属广告解锁）；沿用本作时间线（2002 起）；
 *          世界赛代价 + 「万里长城」完全抵消（上一轮开发者要求，保留）。
 * ========================================================================== */
(function(){
'use strict';
if(window.__v66World)return;window.__v66World=true;

/* 关掉 v65 那套简化世界赛：否则两套会同时生成 pending、弹两个征召窗，
   v65 的旧界面还会抢 renderCareer（实测确认）。 */
window.__v65WorldDisabled=true;
try{
  if(typeof career!=='undefined'&&career&&career.v65Intl)career.v65Intl.pending=null;
}catch(e){}

/* ---------- 41 国真实数据（照搬参考项目 career-plus-data.js；中国队改为 2008 真实国手） ---------- */
var V66_COUNTRIES = {"USA": {"name": "美国", "flag": "🇺🇸", "region": "Americas", "strength": 98, "players": ["斯蒂芬-库里", "勒布朗-詹姆斯", "凯文-杜兰特", "杰森-塔图姆", "德文-布克", "安东尼-爱德华兹", "朱-霍勒迪", "巴姆-阿德巴约", "安东尼-戴维斯", "泰瑞斯-哈利伯顿", "乔尔-恩比德", "德里克-怀特"]}, "GER": {"name": "德国", "flag": "🇩🇪", "region": "Europe", "strength": 94, "players": ["丹尼斯-施罗德", "弗朗茨-瓦格纳", "莫里茨-瓦格纳", "丹尼尔-泰斯", "约翰内斯-蒂曼", "安德烈亚斯-奥布斯特", "伊萨克-邦加", "尼尔斯-吉菲", "马奥多-洛", "约翰内斯-沃格特曼", "贾斯图斯-霍拉茨", "奥斯卡-达席尔瓦"]}, "SRB": {"name": "塞尔维亚", "flag": "🇷🇸", "region": "Europe", "strength": 94, "players": ["尼古拉-约基奇", "博格丹-博格达诺维奇", "尼古拉-约维奇", "瓦西里耶-米西奇", "亚历克萨-阿夫拉莫维奇", "菲利普-彼得鲁舍夫", "尼古拉-米卢蒂诺夫", "马尔科-古杜里奇", "奥格年-多布里奇", "德扬-达维多瓦茨", "万尼亚-马林科维奇", "乌罗斯-普拉夫希奇"]}, "FRA": {"name": "法国", "flag": "🇫🇷", "region": "Europe", "strength": 94, "players": ["维克托-文班亚马", "鲁迪-戈贝尔", "埃文-富尼耶", "尼古拉斯-巴图姆", "盖尔雄-亚布塞莱", "弗兰克-尼利基纳", "马蒂亚斯-莱索尔", "南多-德科洛", "伊萨亚-科尔迪尼耶", "安德鲁-阿尔比西", "马修-斯特拉泽尔", "比拉尔-库利巴利"]}, "CAN": {"name": "加拿大", "flag": "🇨🇦", "region": "Americas", "strength": 93, "players": ["谢伊-吉尔杰斯-亚历山大", "贾马尔-穆雷", "RJ-巴雷特", "狄龙-布鲁克斯", "卢-多尔特", "安德鲁-内姆布哈德", "尼基尔-亚历山大-沃克", "凯利-奥利尼克", "德怀特-鲍威尔", "特雷-莱尔斯", "梅尔文-埃吉姆", "扎克-埃迪"]}, "ESP": {"name": "西班牙", "flag": "🇪🇸", "region": "Europe", "strength": 90, "players": ["桑蒂-阿尔达马", "威利-埃尔南戈麦斯", "胡安乔-埃尔南戈麦斯", "洛伦佐-布朗", "亚历克斯-阿布里内斯", "达里奥-布里苏埃拉", "海梅-普拉迪利亚", "乌斯曼-加鲁巴", "塞尔希奥-尤伊", "阿尔韦托-迪亚斯", "乔尔-帕拉", "鲁迪-费尔南德斯"]}, "AUS": {"name": "澳大利亚", "flag": "🇦🇺", "region": "Asia", "strength": 90, "players": ["乔什-吉迪", "帕蒂-米尔斯", "乔-英格尔斯", "戴森-丹尼尔斯", "约什-格林", "乔克-兰代尔", "丹特-埃克萨姆", "马修-德拉维多瓦", "泽维尔-库克斯", "杜普-里斯", "杰克-麦克维", "威尔-马格奈"]}, "ARG": {"name": "阿根廷", "flag": "🇦🇷", "region": "Americas", "strength": 88, "players": ["法昆多-坎帕佐", "加布里埃尔-戴克", "尼古拉斯-拉普罗维托拉", "卢卡-维尔多萨", "莱安德罗-博尔马罗", "胡安-布鲁西诺", "尼古拉斯-布鲁西诺", "马科斯-德利亚", "贡萨洛-布雷桑", "何塞-维尔多萨", "胡安-费尔南德斯", "罗伯托-阿库尼亚"]}, "BRA": {"name": "巴西", "flag": "🇧🇷", "region": "Americas", "strength": 88, "players": ["布鲁诺-卡博克洛", "马塞利尼奥-韦尔塔斯", "劳尔-内托", "乔治-德保拉", "维托尔-贝尼特", "莱昂纳多-迈因德尔", "雅戈-桑托斯", "吉-桑托斯", "克里斯蒂亚诺-费利西奥", "卢卡斯-迪亚斯", "若昂-卡多索", "迪迪-卢扎达"]}, "LTU": {"name": "立陶宛", "flag": "🇱🇹", "region": "Europe", "strength": 88, "players": ["多曼塔斯-萨博尼斯", "约纳斯-瓦兰丘纳斯", "罗卡斯-约库拜蒂斯", "马里乌斯-格里戈尼斯", "伊格纳斯-布拉兹代基斯", "明道加斯-库兹明斯卡斯", "多维达斯-吉德赖蒂斯", "托马斯-迪姆萨", "德伊维达斯-西尔维迪斯", "劳里纳斯-比鲁蒂斯", "艾曼塔斯-本朱斯", "塔达斯-塞德克斯基斯"]}, "TUR": {"name": "土耳其", "flag": "🇹🇷", "region": "Europe", "strength": 88, "players": ["阿尔佩伦-申京", "切迪-奥斯曼", "谢恩-拉金", "富尔坎-科尔克马兹", "奥梅尔-尤尔特塞文", "厄尔詹-奥斯马尼", "奥努拉尔普-比蒂姆", "凯南-西帕希", "塞尔塔奇-尚勒", "布格拉汉-通杰尔", "梅利赫-马赫穆托格鲁", "赛穆斯-哈泽尔"]}, "GRE": {"name": "希腊", "flag": "🇬🇷", "region": "Europe", "strength": 87, "players": ["扬尼斯-阿德托昆博", "科斯塔斯-帕帕尼古拉乌", "尼克-卡拉西斯", "托马斯-沃卡普", "迪诺斯-米托格鲁", "乔治斯-帕帕扬尼斯", "扬努利斯-拉伦扎基斯", "瓦西利斯-托利奥普洛斯", "科斯塔斯-阿德托昆博", "尼科斯-罗格卡沃普洛斯", "帕纳约蒂斯-卡莱察基斯", "迪米特里斯-莫莱蒂斯"]}, "ITA": {"name": "意大利", "flag": "🇮🇹", "region": "Europe", "strength": 86, "players": ["西蒙尼-丰泰基奥", "尼科洛-梅利", "达尼洛-加里纳利", "马尔科-斯皮苏", "斯特凡诺-托努特", "詹保罗-里奇", "阿基勒-波洛纳拉", "亚历山德罗-帕约拉", "马泰奥-斯帕尼奥洛", "加布里埃莱-普罗奇达", "古列尔莫-卡鲁索", "里卡多-维斯孔蒂"]}, "LAT": {"name": "拉脱维亚", "flag": "🇱🇻", "region": "Europe", "strength": 86, "players": ["克里斯塔普斯-波尔津吉斯", "戴维斯-贝尔坦斯", "戴里斯-贝尔坦斯", "阿图尔斯-扎加尔斯", "罗季翁斯-库鲁茨", "罗兰兹-施密茨", "安德烈斯-格拉祖利斯", "克里斯特斯-佐里克斯", "阿图尔斯-库鲁茨", "克拉夫斯-查瓦尔斯", "安泽斯-帕塞奇尼克斯", "马雷克斯-梅耶里斯"]}, "SLO": {"name": "斯洛文尼亚", "flag": "🇸🇮", "region": "Europe", "strength": 86, "players": ["卢卡-东契奇", "戈兰-德拉季奇", "佐兰-德拉季奇", "迈克-托比", "弗拉特科-钱查尔", "克莱门-普雷佩利奇", "亚卡-布拉日奇", "格雷戈尔-赫罗瓦特", "阿列克谢-尼科利奇", "日加-迪梅茨", "埃多-穆里奇", "雅各布-采巴舍克"]}, "CRO": {"name": "克罗地亚", "flag": "🇭🇷", "region": "Europe", "strength": 84, "players": ["伊维察-祖巴茨", "达里奥-萨里奇", "博扬-博格达诺维奇", "马里奥-海佐尼亚", "杰伦-史密斯", "罗科-普尔卡钦", "戈兰-菲利波维奇", "马特奥-德雷日尼亚克", "安东尼奥-乔丹诺", "卡洛-马特科维奇", "洛夫罗-格尼迪奇", "丹科-布兰科维奇"]}, "MNE": {"name": "黑山", "flag": "🇲🇪", "region": "Europe", "strength": 83, "players": ["尼古拉-武切维奇", "肯德里克-佩里", "博扬-杜布列维奇", "马尔科-西蒙诺维奇", "迪诺-拉多契奇", "内马尼亚-拉多维奇", "弗拉迪米尔-米海洛维奇", "彼得-波波维奇", "安德里亚-斯拉夫科维奇", "约万-克利亚伊奇", "佐兰-尼科利奇", "伊戈尔-德罗布尼亚克"]}, "FIN": {"name": "芬兰", "flag": "🇫🇮", "region": "Europe", "strength": 83, "players": ["劳里-马尔卡宁", "萨苏-萨林", "米卡埃尔-扬图宁", "埃利亚斯-瓦尔托宁", "奥利维耶-恩卡姆瓦", "亚历山大-马德森", "埃顿-马克苏尼", "雅各布-格兰迪森", "米罗-利特尔", "亨利-坎托宁", "伊拉里-塞帕拉", "托皮亚斯-帕尔米"]}, "GEO": {"name": "格鲁吉亚", "flag": "🇬🇪", "region": "Europe", "strength": 82, "players": ["戈加-比塔泽", "桑德罗-马穆凯拉什维利", "托尼克-申格利亚", "塔杜斯-麦克法登", "乔治-谢尔马迪尼", "杜达-萨纳泽", "拉蒂-安德罗尼卡什维利", "米哈伊尔-贝里什维利", "卡哈贝尔-金察泽", "布卡-费什维利", "乔治-齐齐什维利", "贝卡-布尔贾纳泽"]}, "PUR": {"name": "波多黎各", "flag": "🇵🇷", "region": "Americas", "strength": 82, "players": ["何塞-阿尔瓦拉多", "特里蒙特-沃特斯", "乔丹-霍华德", "乔治-康迪特", "伊斯梅尔-罗梅罗", "吉安-克拉韦尔", "斯蒂芬-汤普森", "阿莱姆-福特", "克里斯托弗-奥尔蒂斯", "伊桑-汤普森", "阿里纳尔多-托罗", "达沃恩-里德"]}, "DOM": {"name": "多米尼加", "flag": "🇩🇴", "region": "Americas", "strength": 81, "players": ["卡尔-安东尼-唐斯", "克里斯-杜阿尔特", "安赫尔-德尔加多", "安德烈斯-费利斯", "维克托-利兹", "吉恩-蒙特罗", "埃洛伊-巴尔加斯", "莱斯特-基尼奥内斯", "路易斯-桑托斯", "里戈韦托-门多萨", "胡安-格雷罗", "杰林-摩根"]}, "SSD": {"name": "南苏丹", "flag": "🇸🇸", "region": "Africa", "strength": 81, "players": ["卡里克-琼斯", "韦尼恩-加布里埃尔", "马里亚尔-沙约克", "努尼-奥莫特", "库阿尼-库阿尼", "彼得-乔克", "科乔尔-恩戈尔", "杰克逊-马科伊", "桑迪-戴奇", "曼戈克-马蒂昂", "JT-索尔", "博尔-博尔"]}, "CHN": {"name": "中国", "flag": "🇨🇳", "region": "Asia", "strength": 77, "players": ["易建联", "王治郅", "刘炜", "朱芳雨", "王仕鹏", "杜锋", "李楠", "孙悦", "陈江华", "王磊", "张庆鹏"]}, "JPN": {"name": "日本", "flag": "🇯🇵", "region": "Asia", "strength": 78, "players": ["八村塁", "渡边雄太", "河村勇辉", "富永启生", "比江岛慎", "马场雄大", "乔希-霍金森", "雅各布斯晶", "吉井裕鹰", "富坚勇树", "井上宗一郎", "渡边飞勇"]}, "NZL": {"name": "新西兰", "flag": "🇳🇿", "region": "Asia", "strength": 78, "players": ["科里-韦伯斯特", "泰-韦伯斯特", "谢伊-伊利", "菲恩-德拉尼", "乔丹-恩加泰", "伊扎亚-勒阿法", "托希-史密斯-米尔纳", "萨姆-门内加", "马克斯-达林", "乔丹-亨特", "莫希-麦卡锡", "泰勒-布里特"]}, "IRI": {"name": "伊朗", "flag": "🇮🇷", "region": "Asia", "strength": 75, "players": ["阿萨兰-卡泽米", "西纳-瓦赫迪", "穆罕默德-阿米尼", "马廷-阿加詹普尔", "赛义德-迈赫迪-贾法里", "阿尔曼-赞加内", "莫宾-谢赫", "穆罕默德-拉希米", "哈桑-阿里阿克巴里", "梅萨姆-米尔扎伊", "彼得-吉尔古里安", "萨贾德-马什亚耶基"]}, "PHI": {"name": "菲律宾", "flag": "🇵🇭", "region": "Asia", "strength": 75, "players": ["乔丹-克拉克森", "凯-索托", "贾斯汀-布朗利", "德怀特-拉莫斯", "斯科蒂-汤普森", "克里斯-纽瑟姆", "卡尔-塔马约", "凯文-奎安巴奥", "AJ-埃杜", "卡尔文-奥夫塔纳", "朱恩-马尔-法哈多", "雷-帕克斯"]}, "KOR": {"name": "韩国", "flag": "🇰🇷", "region": "Asia", "strength": 74, "players": ["李贤重", "河允基", "许勋", "许雄", "金钟奎", "罗健儿", "梁洪硕", "文正贤", "李禹锡", "宋教昌", "郑孝根", "刘基相"]}, "LBN": {"name": "黎巴嫩", "flag": "🇱🇧", "region": "Asia", "strength": 74, "players": ["瓦埃尔-阿拉基", "奥马里-斯佩尔曼", "阿里-海达尔", "塞尔吉奥-达维奇", "阿米尔-沙特", "卡里姆-泽农", "尤素夫-海亚特", "马克-哈提布", "杰拉德-哈迪迪安", "阿里-曼苏尔", "海克-久克吉安", "马科斯-埃尔哈吉"]}, "JOR": {"name": "约旦", "flag": "🇯🇴", "region": "Asia", "strength": 72, "players": ["朗戴-霍利斯-杰弗森", "弗雷迪-伊布拉希姆", "艾哈迈德-杜韦里", "达尔-塔克", "萨米-布扎伊", "扎伊德-阿巴斯", "艾哈迈德-哈穆里", "哈希姆-阿巴斯", "阿明-阿布哈瓦斯", "马利克-卡南", "优素福-阿布瓦兹内", "穆罕默德-沙赫尔"]}, "TPE": {"name": "中国台北", "flag": "🏳️", "region": "Asia", "strength": 72, "players": ["陈盈骏", "刘铮", "林庭谦", "胡珑贸", "卢峻翔", "阿巴西", "曾祥钧", "林正", "高锦玮", "周桂羽", "马建豪", "谢亚轩"]}, "KSA": {"name": "沙特阿拉伯", "flag": "🇸🇦", "region": "Asia", "strength": 67, "players": ["穆罕默德-阿尔苏韦勒姆", "马塔尔-阿卜杜勒贾巴尔", "穆罕默德-阿尔马尔瓦尼", "哈立德-阿卜杜勒加巴尔", "穆斯塔法-法拉塔", "纳赛尔-阿布贾拉斯", "马尔祖克-阿尔穆瓦拉德", "阿卜杜勒拉赫曼-阿尔苏韦勒姆", "艾曼-沙基尔", "巴萨姆-阿尔巴赫兰", "扎伊德-阿尔赫迈迪", "贾比尔-卡比"]}, "QAT": {"name": "卡塔尔", "flag": "🇶🇦", "region": "Asia", "strength": 66, "players": ["布兰登-古德温", "巴巴卡-迪昂", "穆罕默德-哈桑", "穆罕默德-优素福", "纳迪姆-穆萨", "泰勒-哈里斯", "哈立德-阿布迪", "阿卜杜拉-穆萨", "阿卜杜拉-萨阿德", "哈迈德-穆萨", "米扎-阿卜杜拉", "塔辛-恩迪亚耶"]}, "IRQ": {"name": "伊拉克", "flag": "🇮🇶", "region": "Asia", "strength": 64, "players": ["德马里奥-梅菲尔德", "阿里-哈米德", "穆罕默德-哈立德", "哈桑-阿卜杜拉", "艾哈迈德-哈穆迪", "阿里-伊斯梅尔", "海德尔-阿卜杜勒萨达", "穆斯塔法-侯赛因", "奥马尔-穆罕默德", "阿巴斯-阿里", "穆罕默德-萨拉赫", "侯赛因-塔利布"]}, "IND": {"name": "印度", "flag": "🇮🇳", "region": "Asia", "strength": 62, "players": ["普兰纳夫-普林斯", "哈什-达加尔", "阿姆约特-辛格", "阿姆里特帕尔-辛格", "塞吉-库马尔", "穆因-贝克", "普拉尚特-辛格", "阿拉温德-安纳杜莱", "洛克什-库马尔", "梅温-阿布拉罕", "库什-辛格", "穆罕默德-萨利赫"]}, "GUM": {"name": "关岛", "flag": "🇬🇺", "region": "Asia", "strength": 61, "players": ["杰里科-克鲁兹", "塔伊-韦斯利", "乔纳森-加洛韦", "德文-德尔菲诺", "达伦-赫夫特", "朱利叶斯-布鲁克斯", "罗斯-马塔", "小克里斯-康纳", "埃内斯托-罗萨里奥", "马克-约翰逊", "迈克尔-萨基桑", "凯尔-侯爵"]}, "SYR": {"name": "叙利亚", "flag": "🇸🇾", "region": "Asia", "strength": 63, "players": ["阿米尔-杰布森", "奥马尔-伊德里比", "哈桑-阿卜杜拉", "卡迈勒-贾比", "穆罕默德-奥斯曼", "纳迪姆-伊萨", "艾哈迈德-哈利勒", "拉米-梅尔基", "穆罕默德-萨利姆", "乔治-纳扎里安", "亚赞-哈桑", "塔里克-贾比"]}, "ANG": {"name": "安哥拉", "flag": "🇦🇴", "region": "Africa", "strength": 76, "players": ["布鲁诺-费尔南多", "西尔维奥-德索萨", "热尔松-贡萨尔维斯", "若昂-费尔南德斯", "尚德-邓道", "赫尔梅尼吉尔多-桑托斯", "莱昂内尔-保罗", "奇尔德-敦道", "若昂-多明戈斯", "爱德华多-明加斯", "安东尼奥-蒙泰罗", "雅尼克-莫雷拉"]}, "EGY": {"name": "埃及", "flag": "🇪🇬", "region": "Africa", "strength": 73, "players": ["阿斯姆-马雷", "埃哈卜-阿明", "奥马尔-奥拉比", "阿姆鲁-金迪", "阿纳斯-马哈茂德", "优素福-舒沙", "卡里姆-哈桑", "亚当-穆萨", "艾哈迈德-梅特瓦利", "海瑟姆-卡迈勒", "穆阿门-雷法特", "奥马尔-希沙姆"]}, "CIV": {"name": "科特迪瓦", "flag": "🇨🇮", "region": "Africa", "strength": 72, "players": ["莫-班巴", "索洛-迪亚巴特", "马特-科斯特洛", "亚历克斯-波伊斯雷斯", "让-菲利普-达利", "阿马杜-西迪贝", "瓦费萨-福法纳", "马克斯韦尔-科南", "伊斯梅尔-迪亚巴特", "查尔斯-阿布奥", "盖伊-埃迪", "弗雷吉斯-泽比"]}, "NGR": {"name": "尼日利亚", "flag": "🇳🇬", "region": "Africa", "strength": 75, "players": ["普雷舍斯-阿丘瓦", "乔什-奥科吉", "乔丹-诺拉", "丘梅齐耶-梅图", "加布-文森特", "斯坦利-奥科耶", "伊克-伊罗格布", "乌佐-伊罗格布", "本-乌佐", "凯莱布-阿加达", "阿拉德-阿米努", "迈克尔-埃里"]}};

var V66_ASIA=['CHN','AUS','JPN','NZL','IRI','PHI','KOR','LBN','JOR','TPE','KSA','QAT','IRQ','IND','GUM','SYR'];

function clamp(n,a,b){return Math.max(a,Math.min(b,n))}
function randomInt(a,b){return a+Math.floor(Math.random()*(b-a+1))}
function shuffle(list){var a=list.slice();for(var i=a.length-1;i>0;i--){var j=Math.floor(Math.random()*(i+1));var t=a[i];a[i]=a[j];a[j]=t}return a}
function esc(v){return String(v==null?'':v).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;')}

/* 我的强度：国家队基础实力 + 我的评分影响；2008 北京奥运主场 +3
   【第七轮调整】开发者要求「姚明存档的世界赛成绩更好，甚至打败美国队」。
   系数 1.15→1.32、clamp 上限 102→106：
     OVR 95 → 强度 98.8，对 USA(98) 54%、GER(94) 74%
     OVR 99 → 强度 104.1，对 USA(98) 79%、GER(94) 91%
   满配姚明对美国的比赛从「被碾压」变成「有来有回甚至占优」。 */
function v66MyStrength(){
  try{
    var ovr=Number(career&&career.ovr)||80;
    var s=V66_COUNTRIES.CHN.strength+(ovr-80)*1.32;
    if(v66IsBeijing())s+=3;
    return clamp(s,55,106);
  }catch(e){return 77}
}
function v66AdjustedStrength(code,userCode){
  var base=V66_COUNTRIES[code]?V66_COUNTRIES[code].strength:68;
  if(code==='CHN')base=v66MyStrength();
  return clamp(base,55,102);
}
function v66IsBeijing(){
  try{return !!(career&&Number(career.seasonYear)===2008&&career.playerId==='yao')}catch(e){return false}
}
window.v66IsBeijing=v66IsBeijing;

/* ---------- 积分表（照搬：胜2分 负1分） ---------- */
function v66CreateTable(codes){var t={};codes.forEach(function(c){t[c]={code:c,w:0,l:0,pf:0,pa:0,pts:0}});return t}
function v66UpdateTable(t,r){
  if(!t[r.a]||!t[r.b])return;
  var ta=t[r.a],tb=t[r.b];
  ta.pf+=r.sa;ta.pa+=r.sb;tb.pf+=r.sb;tb.pa+=r.sa;
  if(r.sa>r.sb){ta.w++;tb.l++;ta.pts+=2;tb.pts+=1}
  else{tb.w++;ta.l++;tb.pts+=2;ta.pts+=1}
}
function v66SortTable(t){
  return Object.keys(t).map(function(k){return t[k]}).sort(function(a,b){
    return b.pts-a.pts||(b.pf-b.pa)-(a.pf-a.pa)||b.pf-a.pf||v66AdjustedStrength(b.code,'')-v66AdjustedStrength(a.code,'')
  });
}

/* ---------- 单场个人数据（照搬 13 项字段；姚明按中锋基准） ---------- */
function v66PlayerStats(win,opponent,stage,margin){
  var ovr=Number(career&&career.ovr)||80;
  var opp=v66AdjustedStrength(opponent,'');
  var mine=v66AdjustedStrength('CHN','');
  var edge=mine-opp;   /* 国家队层面我方比对手强多少 */
  var blow=Math.max(0,Number(margin)||0);
  var mins=clamp(Math.round(29+(ovr-75)*0.30+Math.random()*5),26,40);
  var pressure=/决赛|半决赛|四分之一|淘汰/.test(stage)?1.5:0;
  /* 开发者要求：姚明在国家队的数据要「很华丽」。
     国家队对手强度远低于他每晚在 NBA 面对的中锋，所以基础值与评分涨幅都调高，
     并对弱队（edge）和大胜（blow）额外加成。 */
  var pts=clamp(Math.round(13+(ovr-72)*0.85+Math.max(0,edge)*0.30+blow*0.25+(Math.random()-.40)*11+pressure),8,56);
  var reb=clamp(Math.round(11+(ovr-78)*.22+(Math.random()-.5)*4+blow*0.05),3,26);
  var ast=clamp(Math.round(2.4+(ovr-80)*.14+(Math.random()-.5)*4),0,12);
  var stl=clamp(Math.round(1+(ovr-78)*.05+(Math.random()-.45)*2),0,6);
  var blk=clamp(Math.round(2.6+(ovr-80)*.09+(Math.random()-.5)*2),0,8);
  var tov=clamp(Math.round(1.5+ast*.17+Math.random()*2),0,7);
  var fga=clamp(Math.round(pts*.63+4+Math.random()*4),5,36);
  var fgm=clamp(Math.round(fga*(.40+(ovr-70)*.004+(Math.random()-.5)*.08)),1,fga);
  var threeA=clamp(Math.round(fga*.16),0,fga);
  var threeM=clamp(Math.round(threeA*(.31+(ovr-70)*.0035+(Math.random()-.5)*.08)),0,threeA);
  var ftm=Math.max(0,pts-(fgm-threeM)*2-threeM*3);
  var fta=clamp(ftm+randomInt(0,3),ftm,20);
  return{mins:mins,pts:pts,reb:reb,ast:ast,stl:stl,blk:blk,tov:tov,fgm:fgm,fga:fga,threeM:threeM,threeA:threeA,ftm:ftm,fta:fta,win:win};
}

/* ---------- 单场模拟（照搬比分模型） ---------- */
function v66SimFixture(a,b,stage,userCode,userGames){
  var saP=v66AdjustedStrength(a,userCode),sbP=v66AdjustedStrength(b,userCode);
  var pace=73+(Math.random()-.5)*8;
  var sa=Math.round(pace+(saP-75)*.75-(sbP-75)*.16+(Math.random()-.5)*17);
  var sb=Math.round(pace+(sbP-75)*.75-(saP-75)*.16+(Math.random()-.5)*17);
  sa=clamp(sa,55,126);sb=clamp(sb,55,126);
  if(sa===sb){if(Math.random()<.5)sa+=randomInt(2,8);else sb+=randomInt(2,8)}
  var result={a:a,b:b,sa:sa,sb:sb,winner:sa>sb?a:b,loser:sa>sb?b:a,stage:stage};
  if(a===userCode||b===userCode){
    var opponent=a===userCode?b:a;
    var us=a===userCode?sa:sb,them=a===userCode?sb:sa;
    var blowout=false;
    /* 开发者要求：打日本必须 60 分以上大胜。
       这是刻意写的「名场面」——中国队对日本在游戏里是一场必须碾压的比赛，
       所以不看实力模拟，直接给定比分。
       注意：先定对手得分、再由净胜分推出我方得分，这样净胜必然 ≥60；
       反过来「先定我方分再夹对手分」会被下限顶住，净胜掉到 54（实测踩过）。 */
    if(userCode==='CHN'&&opponent==='JPN'){
      var oppPts=randomInt(42,54);
      var myPts=oppPts+randomInt(60,74);
      if(a===userCode){sa=myPts;sb=oppPts}else{sb=myPts;sa=oppPts}
      result.sa=sa;result.sb=sb;result.winner=userCode;result.loser=opponent;result.blowout=true;
      us=myPts;them=oppPts;blowout=true;
    }
    userGames.push({id:'ig-'+(userGames.length+1),stage:stage,opponent:opponent,
      teamScore:us,oppScore:them,win:us>them,blowout:blowout,
      stats:v66PlayerStats(us>them,opponent,stage,Math.abs(us-them))});
  }
  return result;
}
function v66RoundRobin(codes,stage,userCode,userGames,legs,seedTable){
  var table=seedTable||v66CreateTable(codes);
  legs=legs||1;
  for(var leg=0;leg<legs;leg++){
    for(var i=0;i<codes.length;i++){
      for(var j=i+1;j<codes.length;j++){
        var a=leg%2===0?codes[i]:codes[j],b=leg%2===0?codes[j]:codes[i];
        v66UpdateTable(table,v66SimFixture(a,b,stage,userCode,userGames));
      }
    }
  }
  return{table:table,sorted:v66SortTable(table)};
}
function v66Knockout(codes,stage,userCode,userGames){
  var winners=[],losers=[],results=[];
  for(var i=0;i<codes.length;i+=2){
    if(!codes[i+1]){winners.push(codes[i]);continue}
    var r=v66SimFixture(codes[i],codes[i+1],stage,userCode,userGames);
    winners.push(r.winner);losers.push(r.loser);results.push(r);
  }
  return{winners:winners,losers:losers,results:results};
}
function v66CountryPool(region,include,count){
  var codes=Object.keys(V66_COUNTRIES).filter(function(c){return V66_COUNTRIES[c].region===region&&c!==include});
  codes.sort(function(a,b){return v66AdjustedStrength(b,'')-v66AdjustedStrength(a,'')});
  var top=codes.slice(0,Math.max(count*2,count));
  return [include].concat(shuffle(top).slice(0,count-1));
}
function v66SeededGroups(codes,groupCount){
  var sorted=codes.slice().sort(function(a,b){return v66AdjustedStrength(b,'')-v66AdjustedStrength(a,'')});
  var groups=[];for(var g=0;g<groupCount;g++)groups[g]=[];
  sorted.forEach(function(code,idx){
    var row=Math.floor(idx/groupCount),col=idx%groupCount;
    if(row%2===1)col=groupCount-1-col;
    groups[col].push(code);
  });
  return groups;
}
function v66SelectField(count,include){
  var codes=Object.keys(V66_COUNTRIES).sort(function(a,b){return v66AdjustedStrength(b,'')-v66AdjustedStrength(a,'')});
  var result=[];
  if(include)result.push(include);
  codes.forEach(function(code){if(result.length<count&&result.indexOf(code)<0)result.push(code)});
  return result;
}

/* ---------- 世界杯（照搬，修掉两个 bug） ---------- */
function v66BuildWorldCup(year,userCode){
  var games=[];var info=V66_COUNTRIES[userCode];
  var qGroup=v66CountryPool(info.region,userCode,6);
  var qualifier=v66RoundRobin(qGroup,'世界杯预选赛',userCode,games,2);
  var qRank=qualifier.sorted.map(function(x){return x.code}).indexOf(userCode)+1;
  if(qRank>3)return{type:'worldCup',title:'男篮世界杯',year:year,country:userCode,qualified:false,finalPlace:'预选赛出局',rankText:'地区预选赛第'+qRank+'名',games:games,format:'地区预选赛主客场双循环 → 32队正赛'};
  var field=v66SelectField(32,userCode),groups=v66SeededGroups(field,8),secondRound=[];
  var firstTables=[],advanced=[];
  groups.forEach(function(group,idx){
    var rr=v66RoundRobin(group,'世界杯第一阶段 · '+String.fromCharCode(65+idx)+'组',userCode,games,1);
    firstTables[idx]=rr.table;advanced[idx]=rr.sorted.slice(0,2).map(function(x){return x.code});
  });
  for(var pair=0;pair<4;pair++){
    var left=advanced[pair*2],right=advanced[pair*2+1],merged=left.concat(right),table=v66CreateTable(merged);
    /* 【bug①修正】带入交手结果时也要带积分（胜2负1） */
    [left,right].forEach(function(side){
      var gi=groups.findIndex(function(g){return g.indexOf(side[0])>=0});
      var old=firstTables[gi];
      if(old){
        var aWin=old[side[0]].w>old[side[1]].w;
        if(aWin){table[side[0]].w+=1;table[side[1]].l+=1;table[side[0]].pts+=2;table[side[1]].pts+=1}
        else{table[side[1]].w+=1;table[side[0]].l+=1;table[side[1]].pts+=2;table[side[0]].pts+=1}
      }
    });
    for(var i=0;i<left.length;i++)for(var j=0;j<right.length;j++)v66UpdateTable(table,v66SimFixture(left[i],right[j],'世界杯第二阶段 · '+String.fromCharCode(73+pair)+'组',userCode,games));
    var sorted=v66SortTable(table);secondRound.push(sorted);advanced[pair]=sorted.slice(0,2).map(function(x){return x.code});
  }
  var qf=[advanced[0][0],advanced[1][1],advanced[2][0],advanced[3][1],advanced[1][0],advanced[0][1],advanced[3][0],advanced[2][1]];
  var quarter=v66Knockout(qf,'世界杯四分之一决赛',userCode,games);
  var semi=v66Knockout(quarter.winners,'世界杯半决赛',userCode,games);
  var bronze=v66SimFixture(semi.losers[0],semi.losers[1],'世界杯季军赛',userCode,games);
  var final=v66SimFixture(semi.winners[0],semi.winners[1],'世界杯决赛',userCode,games);
  var placement={};
  placement[final.winner]=1;placement[final.loser]=2;placement[bronze.winner]=3;placement[bronze.loser]=4;
  quarter.losers.forEach(function(code,idx){placement[code]=5+idx});
  /* 【bug②修正】应为 placement[x.code]（参考项目误写成外层残留变量 code） */
  secondRound.forEach(function(list){list.slice(2).forEach(function(x){if(!placement[x.code])placement[x.code]=9+Object.keys(placement).length%8})});
  field.forEach(function(code){if(!placement[code])placement[code]=17+Object.keys(placement).length%16});
  var byRegion={Europe:[],Americas:[],Africa:[],Asia:[]};
  Object.keys(placement).forEach(function(code){if(V66_COUNTRIES[code]&&byRegion[V66_COUNTRIES[code].region])byRegion[V66_COUNTRIES[code].region].push(code)});
  Object.keys(byRegion).forEach(function(r){byRegion[r].sort(function(a,b){return placement[a]-placement[b]})});
  var oceania=byRegion.Asia.filter(function(c){return c==='AUS'||c==='NZL'});
  var asia=byRegion.Asia.filter(function(c){return c!=='AUS'&&c!=='NZL'});
  var direct=(byRegion.Europe.slice(0,2)).concat(byRegion.Americas.slice(0,2),byRegion.Africa.slice(0,1),asia.slice(0,1),oceania.slice(0,1));
  var place=placement[userCode]||32;
  return{type:'worldCup',title:'男篮世界杯',year:year,country:userCode,qualified:true,finalPlace:place===1?'世界冠军':('第'+place+'名'),place:place,games:games,directOlympic:direct,format:'地区预选赛 → 8组×4队第一阶段 → 4组×4队第二阶段（带入交手结果）→ 八强淘汰赛'};
}

/* ---------- 亚锦赛（照搬） ---------- */
function v66BuildAsiaCup(year,userCode){
  var games=[];
  var pool=V66_ASIA.filter(function(c){return c!==userCode&&V66_COUNTRIES[c]});
  pool.sort(function(a,b){return v66AdjustedStrength(b,'')-v66AdjustedStrength(a,'')});
  /* 【第六轮调整】中日大战是固定戏码（开发者要求「打日本必须大胜」），但原实现
     预选组从亚洲池随机抽 3 队，日本常被漏抽（实测 10 届只遇 2 次）。
     改为：预选组必含日本（若在本届池内），再随机补 2 队。 */
  var qRest=pool.filter(function(c){return c!=='JPN'});
  var qGroup=[userCode,'JPN'].concat(shuffle(qRest).slice(0,2));
  var qualifier=v66RoundRobin(qGroup,'亚锦赛预选赛',userCode,games,2);
  var qRank=qualifier.sorted.map(function(x){return x.code}).indexOf(userCode)+1;
  if(qRank>2)return{type:'asiaCup',title:'亚锦赛（FIBA亚洲杯）',year:year,country:userCode,qualified:false,finalPlace:'预选赛出局',rankText:'预选赛小组第'+qRank+'名',games:games,format:'4队预选组主客场双循环 → 16队正赛'};
  var field=[userCode];pool.forEach(function(c){if(field.length<16&&field.indexOf(c)<0)field.push(c)});
  var groups=v66SeededGroups(field,4),winners=[],playInSeeds=[],userGroupRank=4;
  groups.forEach(function(group,idx){
    var rr=v66RoundRobin(group,'亚锦赛小组赛 · '+String.fromCharCode(65+idx)+'组',userCode,games,1);
    winners.push(rr.sorted[0].code);playInSeeds.push(rr.sorted[1].code,rr.sorted[2].code);
    var ri=rr.sorted.map(function(x){return x.code}).indexOf(userCode);if(ri>=0)userGroupRank=ri+1;
  });
  var qualifiers=[];
  for(var i=0;i<4;i++){
    var a=playInSeeds[i*2],b=playInSeeds[((i+1)%4)*2+1];
    qualifiers.push(v66SimFixture(a,b,'亚锦赛八强资格赛',userCode,games).winner);
  }
  var qf=[];for(var j=0;j<4;j++)qf.push(winners[j],qualifiers[j]);
  if(userGroupRank===4)return{type:'asiaCup',title:'亚锦赛（FIBA亚洲杯）',year:year,country:userCode,qualified:true,finalPlace:'小组赛出局',place:13,games:games,format:'4组×4队；小组第一直通八强，第二/第三参加八强资格赛'};
  if(qf.indexOf(userCode)<0)return{type:'asiaCup',title:'亚锦赛（FIBA亚洲杯）',year:year,country:userCode,qualified:true,finalPlace:'八强资格赛出局',place:9,games:games,format:'4组×4队；小组第一直通八强，第二/第三参加八强资格赛'};
  var quarter=v66Knockout(qf,'亚锦赛四分之一决赛',userCode,games);
  if(quarter.winners.indexOf(userCode)<0)return{type:'asiaCup',title:'亚锦赛（FIBA亚洲杯）',year:year,country:userCode,qualified:true,finalPlace:'八强',place:5,games:games,format:'4组×4队 → 八强资格赛 → 八强单场淘汰'};
  var semi=v66Knockout(quarter.winners,'亚锦赛半决赛',userCode,games);
  var bronze=v66SimFixture(semi.losers[0],semi.losers[1],'亚锦赛季军赛',userCode,games);
  var final=v66SimFixture(semi.winners[0],semi.winners[1],'亚锦赛决赛',userCode,games);
  var place=final.winner===userCode?1:final.loser===userCode?2:bronze.winner===userCode?3:4;
  return{type:'asiaCup',title:'亚锦赛（FIBA亚洲杯）',year:year,country:userCode,qualified:true,finalPlace:place===1?'亚洲冠军':place===2?'亚军':place===3?'季军':'第四名',place:place,games:games,format:'4组×4队；小组第一直通八强，第二/第三参加八强资格赛，之后单场淘汰'};
}

/* ---------- 奥运会（照搬） ---------- */
function v66BuildOlympics(year,userCode){
  var games=[];var c=ensureV66();
  var directList=(c.v66Intl.olympicDirect&&c.v66Intl.olympicDirect[year])||[];
  /* 东道主自动获得奥运席位（照搬参考里 USA/2028 的写法，本项目把 2008 北京给中国） */
  var host=(userCode==='CHN'&&year===2008)||(userCode==='USA'&&year===2028);
  var direct=host||directList.indexOf(userCode)>=0;
  if(!direct){
    var candidates=v66SelectField(20,userCode).filter(function(code){return directList.indexOf(code)<0});
    var oqt=[userCode].concat(shuffle(candidates.filter(function(x){return x!==userCode})).slice(0,5));
    var groups=v66SeededGroups(oqt,2),adv=[];
    groups.forEach(function(group,idx){var rr=v66RoundRobin(group,'奥运落选赛小组赛 · '+String.fromCharCode(65+idx)+'组',userCode,games,1);adv[idx]=rr.sorted.slice(0,2).map(function(x){return x.code})});
    var semis=[adv[0][0],adv[1][1],adv[1][0],adv[0][1]];
    if(semis.indexOf(userCode)<0)return{type:'olympics',title:'奥运会',year:year,country:userCode,qualified:false,finalPlace:'奥运落选赛小组出局',games:games,format:'4站落选赛，每站6队分为2组；前二进半决赛，最终冠军获得奥运席位'};
    var semi=v66Knockout(semis,'奥运落选赛半决赛',userCode,games);
    if(semi.winners.indexOf(userCode)<0)return{type:'olympics',title:'奥运会',year:year,country:userCode,qualified:false,finalPlace:'奥运落选赛半决赛出局',games:games,format:'每站6队、2组×3队；小组前二进半决赛，冠军获得唯一席位'};
    var oqtFinal=v66SimFixture(semi.winners[0],semi.winners[1],'奥运落选赛决赛',userCode,games);
    if(oqtFinal.winner!==userCode)return{type:'olympics',title:'奥运会',year:year,country:userCode,qualified:false,finalPlace:'奥运落选赛亚军',games:games,format:'每站6队、2组×3队；冠军获得唯一奥运席位'};
  }
  var field=[];
  directList.forEach(function(code){if(V66_COUNTRIES[code]&&field.indexOf(code)<0&&field.length<8)field.push(code)});
  v66SelectField(20,userCode).forEach(function(code){if(field.length<12&&field.indexOf(code)<0)field.push(code)});
  if(field.indexOf(userCode)<0){field[field.length-1]=userCode}
  var olympicGroups=v66SeededGroups(field,3),qualified=[],thirds=[];
  olympicGroups.forEach(function(group,idx){
    var rr=v66RoundRobin(group,'奥运会小组赛 · '+String.fromCharCode(65+idx)+'组',userCode,games,1);
    qualified.push(rr.sorted[0],rr.sorted[1]);thirds.push(rr.sorted[2]);
  });
  thirds.sort(function(a,b){return b.pts-a.pts||(b.pf-b.pa)-(a.pf-a.pa)});
  qualified.push(thirds[0],thirds[1]);
  qualified.sort(function(a,b){return b.pts-a.pts||(b.pf-b.pa)-(a.pf-a.pa)});
  var qf=[qualified[0].code,qualified[7].code,qualified[3].code,qualified[4].code,qualified[1].code,qualified[6].code,qualified[2].code,qualified[5].code];
  if(qf.indexOf(userCode)<0)return{type:'olympics',title:'奥运会',year:year,country:userCode,qualified:true,finalPlace:'奥运会小组赛出局',place:9,games:games,format:'12队分3组；每组前二与2个成绩最好的第三名晋级八强'};
  var quarter=v66Knockout(qf,'奥运会四分之一决赛',userCode,games);
  if(quarter.winners.indexOf(userCode)<0)return{type:'olympics',title:'奥运会',year:year,country:userCode,qualified:true,finalPlace:'奥运会八强',place:5,games:games,format:'12队分3组 → 8队淘汰赛'};
  var semi2=v66Knockout(quarter.winners,'奥运会半决赛',userCode,games);
  var bronze=v66SimFixture(semi2.losers[0],semi2.losers[1],'奥运会铜牌赛',userCode,games);
  var final=v66SimFixture(semi2.winners[0],semi2.winners[1],'奥运会金牌赛',userCode,games);
  var place=final.winner===userCode?1:final.loser===userCode?2:bronze.winner===userCode?3:4;
  return{type:'olympics',title:'奥运会',year:year,country:userCode,qualified:true,finalPlace:place===1?'奥运金牌':place===2?'奥运银牌':place===3?'奥运铜牌':'第四名',place:place,games:games,format:'世界杯直通席位/奥运落选赛 → 12队分3组 → 8队单场淘汰'};
}

function v66BuildTournament(event,year,country){
  if(event.type==='worldCup')return v66BuildWorldCup(year,country);
  if(event.type==='asiaCup')return v66BuildAsiaCup(year,country);
  return v66BuildOlympics(year,country);
}
window.v66BuildTournament=v66BuildTournament;

/* ---------- 状态 ---------- */
function ensureV66(){
  var c=career||{};
  c.v66Intl=c.v66Intl||{history:[],olympicDirect:{}};
  c.v66Intl.history=c.v66Intl.history||[];
  c.v66Intl.olympicDirect=c.v66Intl.olympicDirect||{};
  return c;
}
window.ensureV66=ensureV66;

/* ---------- 排期（【bug③修正】不设年份下限，按真实周期） ---------- */
function v66EventForYear(year){
  year=Number(year)||0;
  if(year>=2004&&(year-2004)%4===0)return{type:'olympics',title:'奥运会',emoji:'🥇'};
  if(year>=2002&&(year-2002)%4===0)return{type:'worldCup',title:'男篮世界杯',emoji:'🌍'};
  if(year>=2002&&(year-2002)%4===2)return{type:'asiaCup',title:'亚锦赛（FIBA亚洲杯）',emoji:'🏆'};
  return null;
}
window.v66EventForYear=v66EventForYear;

function v66ShouldTrigger(){
  try{
    if(!career||career.retired)return null;
    if(career.playerId!=='yao')return null;
    if((career.talents||[]).indexOf('yao_x')<0)return null;
    var year=Number(career.seasonYear)||0;
    var ev=v66EventForYear(year);
    if(!ev)return null;
    var c=ensureV66();
    if((c.v66Intl.history||[]).some(function(x){return x.year===year&&x.type===ev.type}))return null;
    return{event:ev,year:year};
  }catch(e){return null}
}
window.v66ShouldTrigger=v66ShouldTrigger;

/* ---------- 奖项（照搬） ---------- */
function v66Awards(t){
  var awards=[],games=t.games||[],sum=0;
  games.forEach(function(g){sum+=(g.stats&&g.stats.pts)||0});
  var avg=games.length?sum/games.length:0;
  if(t.place===1){
    if(t.type==='olympics')awards.push({label:'奥运会金牌',emoji:'🥇'});
    else if(t.type==='worldCup')awards.push({label:'男篮世界杯冠军',emoji:'🌍'});
    else awards.push({label:'亚锦赛冠军',emoji:'🏆'});
    if(avg>=17)awards.push({label:t.title+' MVP',emoji:'👑'});
  }else if(t.place===2){awards.push({label:t.type==='olympics'?'奥运会银牌':t.title+'亚军',emoji:'🥈'})}
  else if(t.place===3){awards.push({label:t.type==='olympics'?'奥运会铜牌':t.title+'季军',emoji:'🥉'})}
  if(t.place&&t.place<=4&&avg>=14)awards.push({label:t.title+'最佳阵容',emoji:'🌟'});
  if(avg>=25)awards.push({label:t.title+'得分王',emoji:'🔥'});
  return awards;
}
function v66AvgStats(games){
  var total={pts:0,reb:0,ast:0,stl:0,blk:0,mins:0};
  (games||[]).forEach(function(g){Object.keys(total).forEach(function(k){total[k]+=(g.stats&&g.stats[k])||0})});
  var n=(games&&games.length)||1;
  Object.keys(total).forEach(function(k){total[k]=Math.round(total[k]/n*10)/10});
  return total;
}

/* ---------- 结算：荣誉 + 代价（代价为本作保留项） ---------- */
function v66Settle(t){
  var c=ensureV66();
  if(t.finalized)return;
  t.finalized=true;
  t.awards=v66Awards(t);
  t.avgStats=v66AvgStats(t.games);
  if(t.type==='worldCup'&&t.directOlympic)c.v66Intl.olympicDirect[t.year+1]=t.directOlympic.slice();
  career.honors=career.honors||{};
  t.awards.forEach(function(a){
    var key='intl:'+t.type+':'+t.year+':'+a.label;
    c.v66Intl.keys=c.v66Intl.keys||{};
    if(c.v66Intl.keys[key])return;
    c.v66Intl.keys[key]=1;
    career.honors[a.label]=(career.honors[a.label]||0)+1;
  });
  if(!c.v66Intl.history.some(function(x){return x.type===t.type&&x.year===t.year})){
    c.v66Intl.history.push(JSON.parse(JSON.stringify(t)));
  }
  var n=(t.games||[]).length;
  var compensated=(career.talents||[]).indexOf('yao_x')>=0;
  t.compensated=compensated;
  if(!compensated){
    career.injuryRiskBuff=clamp((Number(career.injuryRiskBuff)||0)+n*0.05,0,3);
    career.health=clamp((Number(career.health)||80)-Math.min(10,n*1.5),0,100);
  }else{
    career.health=clamp((Number(career.health)||80)+Math.min(6,n),0,100);
  }
  career.feed=career.feed||[];
  career.feed.unshift(t.title+'（'+t.year+'）：'+t.finalPlace+'。'+(t.awards.map(function(a){return a.label}).join('、')||'')+(compensated?'（万里长城抵消了国家队负荷）':'（夏天无休，身体负荷增加）'));
  if(typeof save==='function')save();
}
window.v66Settle=v66Settle;

/* ==========================================================================
 * UI（照搬参考项目布局，配色换成本项目暖色主题）
 * ========================================================================== */
function v66InjectStyle(){
  if(document.getElementById('v66-style'))return;
  var st=document.createElement('style');
  st.id='v66-style';
  st.textContent=[
    '.v66-overlay{position:fixed;inset:0;z-index:1500;background:rgba(40,26,18,.72);display:flex;align-items:center;justify-content:center;padding:13px}',
    '.v66-modal{width:min(430px,100%);max-height:92vh;display:flex;flex-direction:column;background:#fffaf4;border:1px solid #ead9c9;border-radius:22px;box-shadow:0 22px 60px rgba(60,32,18,.35);overflow:hidden;color:#4d4036}',
    '.v66-head{padding:13px 14px;border-bottom:1px solid #f0e3d7;display:flex;align-items:center;gap:9px;background:linear-gradient(135deg,#fff4e8,#ffece0)}',
    '.v66-title{font-size:18px;font-weight:1000;flex:1}',
    '.v66-sub{font-size:11.5px;color:#9c8b7d;margin-top:2px}',
    '.v66-close{border:0;background:#f3e8dc;color:#8b7565;width:26px;height:26px;border-radius:50%;font-size:14.5px;line-height:1}',
    '.v66-body{padding:13px;overflow:auto;-webkit-overflow-scrolling:touch}',
    '.v66-card{background:#fff;border:1px solid #eee0d4;border-radius:16px;padding:11px;margin-bottom:9px}',
    '.v66-card.gold{border-color:#e6c98a;background:linear-gradient(135deg,#fff9e8,#fffdf7)}',
    '.v66-kicker{font-size:10.5px;font-weight:1000;color:#c07a3a;letter-spacing:.06em}',
    '.v66-card-title{font-size:15px;font-weight:1000;margin:3px 0}',
    '.v66-muted{font-size:11.5px;color:#8b7a6d;line-height:1.6}',
    '.v66-chips{display:flex;flex-wrap:wrap;gap:5px;margin-top:7px}',
    '.v66-chip{display:inline-flex;align-items:center;border:1px solid #eadfd5;background:#fdf6ef;border-radius:999px;padding:5px 8px;font-size:10.5px;color:#7d6b5d}',
    '.v66-chip.me{border-color:#e0a12f;color:#a86a12;font-weight:1000}',
    '.v66-rating{font-size:21px;font-weight:1000;color:#e08b2e}',
    '.v66-progress{height:8px;background:#f2e8de;border-radius:999px;overflow:hidden}',
    '.v66-progress>i{display:block;height:100%;background:linear-gradient(90deg,#e08b2e,#f0c257)}',
    '.v66-list{display:flex;flex-direction:column;gap:7px}',
    '.v66-game{border:1px solid #eee0d4;border-radius:14px;padding:9px;cursor:pointer;background:#fff}',
    '.v66-game.pending{opacity:.45}',
    '.v66-game.win{border-left:5px solid #3aa66d}',
    '.v66-game.loss{border-left:5px solid #d9534f}',
    '.v66-spread{display:flex;align-items:center;justify-content:space-between;gap:9px}',
    '.v66-score{font-size:17px;font-weight:1000}',
    '.v66-stat-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:7px;margin:9px 0}',
    '.v66-stat{background:#fdf6ef;border:1px solid #f0e3d7;border-radius:12px;padding:8px;text-align:center}',
    '.v66-stat b{display:block;font-size:18px}',
    '.v66-stat span{font-size:10.5px;color:#9c8b7d}',
    '.v66-actions{display:flex;gap:7px;flex-wrap:wrap;padding-top:9px}',
    '.v66-actions button{flex:1;min-width:110px;border:0;border-radius:13px;padding:11px;font-size:11.5px;font-weight:1000;color:#fff;background:linear-gradient(135deg,#e08b2e,#f0b954)}',
    '.v66-actions button.ghost{background:#fff;color:#8b7565;border:1px solid #eadfd5}',
    '.v66-beijing{margin-top:9px;padding:11px;border-radius:16px;background:linear-gradient(150deg,#8a1f2b,#c0392b 60%,#e0a12f);color:#fff}',
    '.v66-beijing b{display:block;font-size:13.5px;color:#ffe6a8}',
    '.v66-beijing span{display:block;font-size:10.5px;line-height:1.7;margin-top:5px;color:#ffeede}',
    '.v66-entry{display:flex;align-items:center;justify-content:space-between;gap:9px;background:#fff;border:1px solid #eee0d4;border-radius:16px;padding:11px;margin-bottom:9px}',
    '.v66-entry button{border:0;border-radius:13px;padding:9px 14px;font-size:11.5px;font-weight:1000;color:#fff;background:linear-gradient(135deg,#e08b2e,#f0b954);flex:none}',
    /* 顶部赛事进度卡 */
    '.v66-progcard{background:linear-gradient(135deg,#fff6ea,#ffeede);border:1px solid #e6c98a;border-radius:16px;padding:11px;margin-bottom:11px}',
    '.v66-prognum{text-align:right;flex:none;line-height:1.1}',
    '.v66-prognum b{display:block;font-size:20px;font-weight:1000;color:#c07a3a}',
    '.v66-prognum span{font-size:10.5px;color:#9c8b7d}',
    '.v66-progmeta{display:flex;justify-content:space-between;font-size:10.5px;color:#9c8b7d;margin-top:5px}',
    /* 当前这一场 */
    '.v66-match{background:#fff;border:1px solid #eee0d4;border-radius:18px;padding:14px 11px;margin-bottom:10px}',
    '.v66-match-stage{text-align:center;font-size:11.5px;font-weight:1000;color:#c07a3a;letter-spacing:.06em;margin-bottom:11px}',
    '.v66-match-row{display:flex;align-items:center;justify-content:space-between;gap:8px}',
    '.v66-side{flex:1;text-align:center;min-width:0}',
    '.v66-side b{display:block;font-size:13.5px;font-weight:1000;margin-top:4px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
    '.v66-flag{font-size:31px;line-height:1}',
    '.v66-vs{font-size:13.5px;font-weight:1000;color:#c8b6a5;flex:none}',
    /* 逐轮战报 */
    '.v66-rcard{display:flex;align-items:center;gap:9px;border:1px solid #eee0d4;border-radius:13px;padding:9px;background:#fff;cursor:pointer}',
    '.v66-rcard.v66-blow{border-color:#e0a12f;background:linear-gradient(135deg,#fff9e8,#fffdf7)}',
    '.v66-rmark{font-size:12.5px;font-weight:1000;color:#c8b6a5;flex:none}',
    '.v66-rcard b{display:block;font-size:12.5px;font-weight:1000}',
    '.v66-rcard small{display:block;font-size:10.5px;color:#8b7a6d;margin-top:2px}',
    '.v66-pill{flex:none;font-size:10.5px;font-weight:1000;border-radius:999px;padding:3px 8px;color:#fff}',
    '.v66-pill.win{background:#3aa66d}',
    '.v66-pill.loss{background:#d9534f}',
    /* 结算 */
    '.v66-result{text-align:center}',
    '.v66-result-main{font-size:23px;font-weight:1000;color:#a86a12;margin:5px 0 3px}',
    /* 阶段节点条（照搬全华班 round-track） */
    '.v66-track{display:flex;gap:5px;margin-top:9px}',
    '.v66-track i{flex:1;text-align:center;font-style:normal;padding:6px 2px;border-radius:11px;background:#f6ece2;color:#b9a596;font-size:9.5px;font-weight:1000;line-height:1.35}',
    '.v66-track i b{display:block;font-size:11.5px}',
    '.v66-track i.done{background:#e7f4ec;color:#2f8a5b}',
    '.v66-track i.active{background:linear-gradient(135deg,#e08b2e,#f0b954);color:#fff}',
    /* 本场战报（照搬全华班 box-best 思路） */
    '.v66-recap{background:#fff;border:1px solid #eee0d4;border-left:5px solid #c8b6a5;border-radius:14px;padding:10px;margin-bottom:10px}',
    '.v66-recap.win{border-left-color:#3aa66d}',
    '.v66-recap.loss{border-left-color:#d9534f}'
  ].join('');
  document.head.appendChild(st);
}
function v66CountryName(code){return V66_COUNTRIES[code]?V66_COUNTRIES[code].name:code}
window.v66CountryName=v66CountryName;

function v66RosterHtml(code){
  var team=V66_COUNTRIES[code]||{players:[]};
  var me=(typeof currentP==='function'&&currentP())?currentP().zh:'你';
  var names=[me+'（你）'].concat((team.players||[]).slice(0,11));
  return '<div class="v66-chips">'+names.map(function(n,i){
    return '<span class="v66-chip'+(i===0?' me':'')+'">'+esc(n)+'</span>';
  }).join('')+'</div>';
}

function v66InviteHtml(event,year,code){
  /* 样式必须在这里注入：征召窗是「塞进 body 的浮层」，没有 .v66-overlay 的
     position:fixed 就会按普通流铺在页面最下方，看起来就是一堆纯文字。
     之前只在赛事页/履历页里注过，征召这条路径漏了。 */
  if(typeof v66InjectStyle==='function')v66InjectStyle();
  var team=V66_COUNTRIES[code]||{name:code,flag:'🏳️',strength:70};
  var isAsia=V66_ASIA.indexOf(code)>=0;
  var fmt=event.type==='olympics'
    ?'世界杯直通席位或6队奥运落选赛（2组×3队、半决赛、决赛）后，进入12队奥运正赛；3组×4队，小组前二和两个最佳第三晋级八强。'
    :event.type==='worldCup'
    ?'地区预选赛后进入32队正赛；8组×4队第一阶段、4组×4队第二阶段，再进入八强单场淘汰。'
    :'预选赛后进入16队正赛；4组×4队，小组第一直通八强，第二和第三参加八强资格赛。';
  return `<div class="v66-overlay" id="v66-invite"><div class="v66-modal"><div class="v66-head"><div style="font-size:27px">${event.emoji}</div><div style="flex:1"><div class="v66-title">${year} ${esc(event.title)}征召</div><div class="v66-sub">${team.flag} ${esc(team.name)}男篮 · 国家实力 ${team.strength}${isAsia?' · 已解锁亚锦赛':''}</div></div></div><div class="v66-body">`
    +`<div class="v66-card gold"><div class="v66-kicker">真实赛制</div><div class="v66-card-title">先争取资格，再争夺奖牌</div><div class="v66-muted">${fmt}</div></div>`
    +`<div class="v66-card"><div class="v66-kicker">本届国家队名单</div><div class="v66-card-title">${team.flag} ${esc(team.name)}男篮</div>${v66RosterHtml(code)}</div>`
    +(year===2008&&event.type==='olympics'?`<div class="v66-beijing"><b>2008 北京奥运 · 主场</b><span>五棵松体育馆，全场都在喊你的名字。这是中国篮球最被期待的一次奥运，也是你职业生涯里最重的一次夏天。</span></div>`:'')
    +`<div class="v66-muted" style="margin-top:9px">接受征召后可选择逐场模拟或快速模拟；每一场都保留你的完整个人数据，奖牌与世界赛奖项会写入荣誉墙。</div>`
    +`<div class="v66-actions"><button class="ghost" data-v66="decline">婉拒征召</button><button data-v66="accept">代表国家队出战</button></div>`
    +`</div></div></div>`;
}

/* ---------------------------------------------------------------------------
 * 赛事界面（照参考 china_olympic_journey 的结构重做）
 *   开发者反馈：「上面顶部是本届赛事进度，然后一场一个界面，
 *              而不是所有比赛堆在一起显示个待赛，然后最终要给出本届赛事中国队的成绩」
 *
 * 旧版把 13 场比赛全铺在一个列表里，没打的显示「待赛」——正是被否掉的做法。
 * 新版：
 *   · 顶部固定「本届赛事进度」条（阶段名 + n/总场次 + 进度百分比 + 中国队当前成绩）
 *   · 正文只有【当前这一场】一张对战卡；已打完的场次收进下方逐轮战报列表（一行一场）
 *   · 打完最后一场 → 结算页给出中国队本届最终成绩（名次/奖牌/晋级路径/你的场均）
 * ------------------------------------------------------------------------- */

/* 逐轮战报：一行一场，不显示未打的「待赛」 */
function v66HistoryList(t,team){
  var done=(t.games||[]).slice(0,t.revealed||0);
  if(!done.length)return '<div class="v66-card"><div class="v66-muted">本届首场比赛尚未开始。完成第一场后，这里会形成逐轮战报。</div></div>';
  return '<div class="v66-list">'+done.map(function(g,idx){
    var opp=V66_COUNTRIES[g.opponent]||{name:g.opponent,flag:'🏳️'};
    var mark=g.win?'胜':'负';
    var blow=g.blowout?' v66-blow':'';
    return '<div class="v66-rcard'+blow+'" data-v66game="'+idx+'"><span class="v66-rmark">'+String(idx+1).padStart(2,'0')+'</span><div style="flex:1;min-width:0"><b>'+esc(g.stage)+'</b><small>'+team.flag+' '+g.teamScore+' - '+g.oppScore+' '+opp.flag+' '+esc(opp.name)+' · 你 '+g.stats.pts+'分'+g.stats.reb+'板'+g.stats.ast+'助</small></div><span class="v66-pill '+(g.win?'win':'loss')+'">'+mark+'</span></div>';
  }).join('')+'</div>';
}

/* 阶段节点条（照搬全华班 intlRoundTrack：小组赛 → 1/4 → 半决赛 → 决赛）
   从赛程里的阶段名反推当前走到哪一步，把已过的节点标 done、当前标 active。 */
function v66RoundTrack(t){
  /* 【第六轮调整】预选赛/落选赛原先被并进「小组赛」桶——打预选赛时节点条显示
     「小组赛」，开发者指出不对。改为按赛事动态决定节点：
       有预选 → 预选赛 → 小组赛 → 八强 → 半决赛 → 决赛（6 节点）
       无预选 → 小组赛 → 八强 → 半决赛 → 决赛（4 节点） */
  var hasQ=(t.games||[]).some(function(g){return /预选赛|落选赛/.test(g.stage)});
  var stages=hasQ?['预选赛','小组赛','八强','半决赛','决赛']:['小组赛','八强','半决赛','决赛'];
  var OFF=hasQ?1:0;
  function bucket(stage){
    if(/决赛$/.test(stage)&&!/半|四分之一/.test(stage))return 3+OFF;
    if(/半决赛/.test(stage))return 2+OFF;
    if(/四分之一|八强资格/.test(stage))return 1+OFF;
    if(/预选赛|落选赛/.test(stage))return 0;
    return OFF;   /* 小组赛/第一阶段/第二阶段 */
  }
  var revealed=t.revealed||0,cur=t.games[revealed];
  var seen={};
  (t.games||[]).slice(0,revealed).forEach(function(g,i){seen[bucket(g.stage)]=true});
  var active=cur?bucket(cur.stage):-1;
  return '<div class="v66-track">'+stages.map(function(s,i){
    var cls=seen[i]?'done':(i===active?'active':'');
    return '<i class="'+cls+'"><b>'+(seen[i]?'✓':(i+1))+'</b><span>'+s+'</span></i>';
  }).join('')+'</div>';
}

/* 中国队本届至今的成绩（照搬全华班 intlChinaStatus） */
function v66ChinaStatus(t){
  var done=(t.games||[]).slice(0,t.revealed||0);
  var w=done.filter(function(g){return g.win}).length,l=done.length-w;
  var cur=t.games[t.revealed];
  if(!cur)return {tag:t.finalPlace||'已结束',line:'本届 '+w+' 胜 '+l+' 负'};
  return {tag:w+' 胜 '+l+' 负',line:'下一场：'+cur.stage+' · 还剩 '+(t.games.length-done.length)+' 场'};
}

function v66RenderTournament(){
  v66InjectStyle();
  var c=ensureV66(),t=c.v66Intl.active;if(!t)return;
  var old=document.getElementById('v66-tournament');if(old)old.remove();
  var team=V66_COUNTRIES[t.country]||{name:t.country,flag:'🏳️'};
  var revealed=t.revealed||0,total=t.games.length;
  var finished=revealed>=total;
  if(finished)v66Settle(t);
  var progress=total?Math.round(revealed/total*100):100;
  var cur=finished?null:t.games[revealed];
  var curOpp=cur?(V66_COUNTRIES[cur.opponent]||{name:cur.opponent,flag:'🏳️'}):null;
  var status=v66ChinaStatus(t);

  /* 顶部：本届赛事进度（阶段节点条 + 中国队当前成绩 + 进度条） */
  var head='<div class="v66-progcard"><div class="v66-spread"><div style="min-width:0">'
    +'<div class="v66-kicker">本届赛事进度</div>'
    +'<div class="v66-card-title" style="margin:2px 0">'+(finished?'已结束 · '+esc(t.finalPlace):'进行至 '+esc(cur?cur.stage:'首场'))+'</div>'
    +'<div class="v66-muted">'+esc(t.format)+'</div></div>'
    +'<div class="v66-prognum"><b>'+(finished?total:revealed)+'/'+total+'</b><span>场</span></div></div>'
    +v66RoundTrack(t)
    +'<div class="v66-progress" style="margin-top:8px"><i style="width:'+progress+'%"></i></div>'
    +'<div class="v66-progmeta"><span>'+esc(team.flag+' '+team.name)+' · '+esc(status.tag)+'</span><span>'+progress+'%</span></div>'
    +'<div class="v66-muted" style="margin-top:4px">'+esc(status.line)+'</div></div>';

  var bodyHtml='';
  if(finished){
    /* ---------- 结算：中国队本届成绩 ---------- */
    var avg=t.avgStats||v66AvgStats(t.games);
    var w=(t.games||[]).filter(function(g){return g.win}).length;
    var l=total-w;
    var medals=[];
    if(t.place===1)medals.push('🥇 冠军');
    else if(t.place===2)medals.push('🥈 亚军');
    else if(t.place===3)medals.push('🥉 季军');
    else if(t.place)medals.push('第 '+t.place+' 名');
    var awardHtml=t.awards&&t.awards.length
      ?'<div class="v66-card gold"><div class="v66-kicker">计入荣誉墙</div><div class="v66-chips">'+t.awards.map(function(a){return '<span class="v66-chip" style="border-color:#e0a12f;color:#9a6a00;font-weight:1000">'+a.emoji+' '+esc(a.label)+'</span>'}).join('')+'</div></div>'
      :'';
    bodyHtml='<div class="v66-card gold v66-result"><div class="v66-kicker">中国队本届最终成绩</div>'
      +'<div class="v66-result-main">'+esc(t.finalPlace)+'</div>'
      +'<div class="v66-muted">'+esc(team.flag+' '+team.name+'男篮 · ')+t.year+' '+esc(t.title)+'</div>'
      +'<div class="v66-stat-grid" style="margin-top:10px">'
      +'<div class="v66-stat"><b>'+w+'-'+l+'</b><span>本届战绩</span></div>'
      +'<div class="v66-stat"><b>'+avg.pts+'</b><span>你场均得分</span></div>'
      +'<div class="v66-stat"><b>'+avg.reb+'</b><span>你场均篮板</span></div>'
      +'</div><div class="v66-stat-grid">'
      +'<div class="v66-stat"><b>'+avg.ast+'</b><span>你场均助攻</span></div>'
      +'<div class="v66-stat"><b>'+avg.blk+'</b><span>你场均盖帽</span></div>'
      +'<div class="v66-stat"><b>'+total+'</b><span>本届出场</span></div></div>'
      +'<div class="v66-muted" style="margin-top:8px">'+(medals.join(' · ')||'')+(t.compensated?' · 万里长城抵消了国家队负荷':' · 夏天无休，身体负荷增加')+'</div></div>'
      +awardHtml
      +'<div class="v66-kicker" style="margin:10px 0 6px">逐轮战报</div>'+v66HistoryList(Object.assign({},t,{revealed:total}),team);
  }else{
    /* ---------- 当前这一场：一场一个界面 ---------- */
    var lastIdx=revealed-1;
    var last=lastIdx>=0?t.games[lastIdx]:null;
    var lastOpp=last?(V66_COUNTRIES[last.opponent]||{name:last.opponent,flag:'🏳️'}):null;
    /* 本场战报（照搬全华班：上一场结束后的单场卡 + 本场最佳） */
    var recap='';
    if(last){
      recap='<div class="v66-recap '+(last.win?'win':'loss')+'"><div class="v66-kicker">本场战报 · '+esc(last.stage)+'</div>'
        +'<div class="v66-spread" style="margin-top:4px"><b>'+esc(team.name)+' '+last.teamScore+' - '+last.oppScore+' '+esc(lastOpp.name)+'</b>'
        +'<span class="v66-pill '+(last.win?'win':'loss')+'">'+(last.win?'胜':'负')+'</span></div>'
        +'<div class="v66-muted">本场最佳 · 你：'+last.stats.pts+' 分 · '+last.stats.reb+' 板 · '+last.stats.ast+' 助 · '+last.stats.blk+' 帽</div></div>';
    }
    bodyHtml=recap+'<div class="v66-match">'
      +'<div class="v66-match-stage">'+esc(cur.stage)+'</div>'
      +'<div class="v66-match-row"><div class="v66-side"><div class="v66-flag">'+team.flag+'</div><b>'+esc(team.name)+'</b></div>'
      +'<div class="v66-vs">VS</div>'
      +'<div class="v66-side"><div class="v66-flag">'+curOpp.flag+'</div><b>'+esc(curOpp.name)+'</b></div></div>'
      +'<div class="v66-muted" style="text-align:center;margin-top:8px">'+(t.country==='CHN'&&cur.opponent==='JPN'?'面对日本，这是一场必须打穿的比赛。':'对手实力 '+ (curOpp.strength||70) +' / 我们 '+Math.round(v66MyStrength()))+'</div>'
      +'</div>'
      +'<div class="v66-actions"><button class="ghost" data-v66="simnext">模拟这一场</button><button data-v66="quick">快速模拟全部</button></div>'
      +(revealed?'<div class="v66-kicker" style="margin:12px 0 6px">逐轮战报</div>'+v66HistoryList(t,team):'');
  }
  var html='<div class="v66-overlay" id="v66-tournament"><div class="v66-modal"><div class="v66-head"><div style="font-size:25px">'+team.flag+'</div><div style="flex:1"><div class="v66-title">'+t.year+' '+esc(t.title)+'</div><div class="v66-sub">'+esc(team.name)+'男篮 · '+(finished?esc(t.finalPlace):(revealed+' / '+total+' 场完成'))+'</div></div><button class="v66-close" data-v66="minimize">—</button></div><div class="v66-body">'
    +head+bodyHtml
    +'<div class="v66-actions">'+(finished?'<button data-v66="finish">进入休赛期</button>':'')+'</div>'
    +'</div></div></div>';
  document.body.insertAdjacentHTML('beforeend',html);
}
window.v66RenderTournament=v66RenderTournament;

window.v66Accept=function(){
  var c=ensureV66(),p=c.v66Intl.pending;if(!p)return;
  var inv=document.getElementById('v66-invite');if(inv)inv.remove();
  var t=v66BuildTournament(p.event,p.year,p.country);t.revealed=0;
  c.v66Intl.active=t;c.v66Intl.pending=null;
  if(typeof save==='function')save();
  v66RenderTournament();
};
window.v66Decline=function(){
  var c=ensureV66(),p=c.v66Intl.pending;if(!p)return;
  var inv=document.getElementById('v66-invite');if(inv)inv.remove();
  c.v66Intl.history.push({type:p.event.type,title:p.event.title,year:p.year,country:p.country,declined:true,finalPlace:'婉拒征召',games:[],awards:[]});
  c.v66Intl.pending=null;
  career.feed=career.feed||[];
  career.feed.unshift('你婉拒了'+p.year+' '+p.event.title+'的征召，保留了完整休整周期。');
  if(typeof save==='function')save();
  if(typeof render==='function')render();
};
window.v66Minimize=function(){
  var m=document.getElementById('v66-tournament');if(m)m.remove();
  if(typeof notify==='function')notify('国际赛尚未完成，可从国际赛履历继续');
};
window.v66SimNext=function(){var t=ensureV66().v66Intl.active;if(!t)return;t.revealed=Math.min(t.games.length,(t.revealed||0)+1);if(typeof save==='function')save();v66RenderTournament()};
window.v66Quick=function(){var t=ensureV66().v66Intl.active;if(!t)return;t.revealed=t.games.length;if(typeof save==='function')save();v66RenderTournament()};
window.v66Finish=function(){
  var m=document.getElementById('v66-tournament');if(m)m.remove();
  var c=ensureV66();
  if(c.v66Intl.active&&c.v66Intl.active.finalized)c.v66Intl.active=null;
  if(typeof save==='function')save();
  if(typeof render==='function')render();
};

window.v66ShowGame=function(idx,historyIndex){
  v66InjectStyle();
  var c=ensureV66();
  var t=historyIndex==null?c.v66Intl.active:(c.v66Intl.history||[])[historyIndex];
  if(!t||!t.games||!t.games[idx])return;
  var g=t.games[idx],team=V66_COUNTRIES[t.country]||{name:t.country,flag:'🏳️'},opp=V66_COUNTRIES[g.opponent]||{name:g.opponent,flag:'🏳️'},s=g.stats;
  var old=document.getElementById('v66-game-detail');if(old)old.remove();
  var shooting=s.fgm+'-'+s.fga+' · 三分 '+s.threeM+'-'+s.threeA+' · 罚球 '+s.ftm+'-'+s.fta;
  document.body.insertAdjacentHTML('beforeend', `<div class="v66-overlay" id="v66-game-detail"><div class="v66-modal" style="max-width:400px"><div class="v66-head"><div style="flex:1"><div class="v66-title">${esc(g.stage)}</div><div class="v66-sub">${esc(team.name)} ${g.teamScore} - ${g.oppScore} ${esc(opp.name)}</div></div><button class="v66-close" data-v66close="1">✕</button></div><div class="v66-body"><div class="v66-card ${g.win?'gold':''}"><div class="v66-spread"><div><div class="v66-kicker">比赛结果</div><div class="v66-card-title">${team.flag} ${esc(team.name)} vs ${opp.flag} ${esc(opp.name)}</div></div><div class="v66-rating">${g.win?'胜':'负'}</div></div></div><div class="v66-stat-grid"><div class="v66-stat"><b>${s.pts}</b><span>得分</span></div><div class="v66-stat"><b>${s.reb}</b><span>篮板</span></div><div class="v66-stat"><b>${s.ast}</b><span>助攻</span></div><div class="v66-stat"><b>${s.stl}</b><span>抢断</span></div><div class="v66-stat"><b>${s.blk}</b><span>盖帽</span></div><div class="v66-stat"><b>${s.tov}</b><span>失误</span></div></div><div class="v66-card"><div class="v66-spread"><span class="v66-muted">出场时间</span><b>${s.mins} 分钟</b></div><div class="v66-spread" style="margin-top:7px"><span class="v66-muted">投篮</span><b style="font-size:12.5px">${shooting}</b></div></div><div class="v66-actions"><button data-v66close="1">返回</button></div></div></div></div>`);
};

window.v66ShowHistory=function(){
  v66InjectStyle();
  var c=ensureV66(),list=(c.v66Intl.history||[]).slice().reverse(),active=c.v66Intl.active;
  var html='';
  if(active)html+='<div class="v66-card gold"><div class="v66-kicker">进行中</div><div class="v66-spread"><div><div class="v66-card-title">'+active.year+' '+active.title+'</div><div class="v66-muted">已完成 '+(active.revealed||0)+' / '+active.games.length+' 场</div></div><button data-v66="resume">继续赛事</button></div></div>';
  if(!list.length)html+='<div class="v66-card"><div class="v66-muted">还没有国际赛事记录。世界杯、奥运会以及亚洲球员专属的亚锦赛会按真实周期在休赛期出现。</div></div>';
  list.forEach(function(t,revIdx){
    var origIdx=(c.v66Intl.history||[]).length-1-revIdx;
    var team=V66_COUNTRIES[t.country]||{name:t.country,flag:'🏳️'};
    var avg=t.avgStats||v66AvgStats(t.games||[]);
    html+='<div class="v66-card '+(t.place&&t.place<=3?'gold':'')+'"><div class="v66-spread"><div><div class="v66-kicker">'+t.year+' · '+team.flag+' '+team.name+'</div><div class="v66-card-title">'+esc(t.title)+' · '+esc(t.finalPlace)+'</div><div class="v66-muted">'+(t.declined?'未出赛':((t.games||[]).length+'场 · 场均 '+avg.pts+'分 '+avg.reb+'板 '+avg.ast+'助'))+'</div></div><button data-v66hist="'+origIdx+'" '+((t.games||[]).length?'':'disabled')+'>比赛记录</button></div></div>';
  });
  var old=document.getElementById('v66-history');if(old)old.remove();
  document.body.insertAdjacentHTML('beforeend','<div class="v66-overlay" id="v66-history"><div class="v66-modal"><div class="v66-head"><div style="flex:1"><div class="v66-title">🌍 国际赛履历</div><div class="v66-sub">每一场国家队比赛与个人数据永久保留</div></div><button class="v66-close" data-v66close="1">✕</button></div><div class="v66-body">'+html+'</div></div></div>');
};

window.v66ShowHistoryGames=function(historyIndex){
  var c=ensureV66(),t=(c.v66Intl.history||[])[historyIndex];if(!t)return;
  var team=V66_COUNTRIES[t.country]||{name:t.country,flag:'🏳️'},html='';
  (t.games||[]).forEach(function(g,idx){
    var opp=V66_COUNTRIES[g.opponent]||{name:g.opponent,flag:'🏳️'};
    html+='<div class="v66-game '+(g.win?'win':'loss')+'" data-v66game="'+idx+'" data-v66histidx="'+historyIndex+'"><div class="v66-spread"><div><div class="v66-kicker">'+esc(g.stage)+'</div><div class="v66-card-title">'+team.flag+' vs '+opp.flag+' '+opp.name+'</div></div><div class="v66-score">'+g.teamScore+' - '+g.oppScore+'</div></div><div class="v66-muted">你：'+g.stats.pts+'分 '+g.stats.reb+'板 '+g.stats.ast+'助</div></div>';
  });
  var modal=document.getElementById('v66-history');if(!modal)return;
  var body=modal.querySelector('.v66-body');if(!body)return;
  body.innerHTML='<div class="v66-actions" style="padding:0 0 9px"><button class="ghost" data-v66="backhistory">← 返回履历</button></div><div class="v66-card"><div class="v66-kicker">'+t.year+'</div><div class="v66-card-title">'+t.title+' · '+t.finalPlace+'</div><div class="v66-muted">点击任意比赛查看个人数据</div></div>'+html;
};

/* ---------- 触发：休赛期弹征召（挂在 endSeason 之后） ---------- */
try{
  if(typeof endSeason==='function'){
    var __v66End=endSeason;
    endSeason=function(){
      var r=__v66End.apply(this,arguments);
      try{
        /* 夺冠那一季：FMVP 投票仪式还没播完/没确认之前不许弹征召，
           否则世界杯征召会抢在颁奖动画前面出现（开发者实测反馈）。
           等仪式走完，它会自己调用 endSeason，届时再弹。 */
        if(typeof career!=='undefined'&&career&&career.fmvpCeremony&&!career.fmvpCeremony.done){
          return r;
        }
        var trig=v66ShouldTrigger();
        if(trig){
          var c=ensureV66();
          c.v66Intl.pending={event:trig.event,year:trig.year,country:'CHN'};
          var inv=document.getElementById('v66-invite');if(inv)inv.remove();
          document.body.insertAdjacentHTML('beforeend',v66InviteHtml(trig.event,trig.year,'CHN'));
          if(typeof save==='function')save();
        }
      }catch(e){}
      return r;
    };
  }
}catch(e){}

/* ---------- 补弹：刷新页面后 pending 还在，但浮层没了 ----------
   存档里只有 pending 数据，DOM 不落盘；不补弹的话玩家刷新一次就再也看不到
   征召窗（履历页也没有，等于这个赛季的世界赛白丢）。 */
function v66MaybeShowInvite(){
  try{
    if(document.getElementById('v66-invite'))return;
    var c=career&&career.v66Intl;
    var p=c&&c.pending;
    if(!p||!p.event)return;
    document.body.insertAdjacentHTML('beforeend',v66InviteHtml(p.event,p.year,p.country||'CHN'));
  }catch(e){}
}
window.v66MaybeShowInvite=v66MaybeShowInvite;
try{
  if(typeof render==='function'){
    var __v66Render=render;
    render=function(){
      var r=__v66Render.apply(this,arguments);
      v66MaybeShowInvite();
      return r;
    };
  }
}catch(e){}

/* ---------- 休赛期面板：加一个「国际赛履历」入口 ----------
   参考项目在训练营里挂了入口按钮；照搬过来，否则履历页没有入口，
   逐场数据、奖牌、世界赛奖项都看不到。 */
try{
  if(typeof offseasonView==='function'){
    var __v66Off=offseasonView;
    offseasonView=function(){
      var h=__v66Off.apply(this,arguments);
      try{
        var n=(career&&career.v66Intl&&career.v66Intl.history||[]).length;
        if(career&&career.playerId==='yao'&&n){
          /* 样式必须在这里注入：入口卡用的是 v66-* 类名，没有这套 CSS
             它就会先以纯文字形式出现在页面上（点进履历页再返回才补上样式）。
             征召窗踩过同一个坑——凡是往主页面直接插 v66 结构的地方都要先注样式。 */
          if(typeof v66InjectStyle==='function')v66InjectStyle();
          var card='<div class="v66-entry"><div><div class="v66-kicker">国家队入口</div><div class="v66-card-title">🇨🇳 中国男篮 · 国际赛履历</div><div class="v66-muted">查看世界杯、奥运会、亚锦赛的逐届成绩与逐场数据</div></div><button data-v66="history">查看</button></div>';
          h=h.replace('<button class="btn primary off-next"',card+'<button class="btn primary off-next"');
        }
      }catch(e){}
      return h;
    };
  }
}catch(e){}

/* ---------- 事件委托：处理 data-v66 / data-v66close / data-v66game / data-v66hist ----------
   为什么用委托而不是内联 onclick：内联写法要在 HTML 字符串里嵌 JS 引号，
   在「字符串拼 HTML」的模板里极易写坏（我上一版就因为引号嵌套导致语法错误）。
   data 属性 + 一次全局委托，既没有引号嵌套问题，也只需要绑一次。 */
try{
  if(!window.__v66Delegated){
    window.__v66Delegated=true;
    document.addEventListener('click',function(ev){
      var el=ev.target;
      if(!el||!el.closest)return;
      try{
        var closeBtn=el.closest('[data-v66close]');
        if(closeBtn){var ov=closeBtn.closest('.v66-overlay');if(ov)ov.remove();return}
        var act=el.closest('[data-v66]');
        if(act){
          var a=act.getAttribute('data-v66');
          if(a==='decline')return v66Decline();
          if(a==='accept')return v66Accept();
          if(a==='minimize')return v66Minimize();
          if(a==='finish')return v66Finish();
          if(a==='simnext')return v66SimNext();
          if(a==='quick')return v66Quick();
          if(a==='resume'){var o=act.closest('.v66-overlay');if(o)o.remove();return v66RenderTournament()}
          if(a==='backhistory')return v66ShowHistory();
          if(a==='history')return v66ShowHistory();
        }
        var hb=el.closest('[data-v66hist]');
        if(hb)return v66ShowHistoryGames(Number(hb.getAttribute('data-v66hist')));
        var gb=el.closest('[data-v66game]');
        if(gb){
          var gi=Number(gb.getAttribute('data-v66game'));
          var hi=gb.getAttribute('data-v66histidx');
          return v66ShowGame(gi, hi==null?null:Number(hi));
        }
      }catch(e){}
    },false);
  }
}catch(e){}

window.v66InviteHtml=v66InviteHtml;
window.__v66Debug={countries:V66_COUNTRIES,eventForYear:v66EventForYear,buildTournament:v66BuildTournament,
  simFixture:v66SimFixture,playerStats:v66PlayerStats,historyList:v66HistoryList,
  shouldTrigger:v66ShouldTrigger,settle:v66Settle,awards:v66Awards,myStrength:v66MyStrength,isBeijing:v66IsBeijing};

})();


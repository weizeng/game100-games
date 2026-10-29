# 可玩性升级进度

每天下午 1 点左右（新加坡时间）的定时任务，从这里挑 10 款「未升级、优先级最高」的游戏做可玩性升级，全部升级完就停。

## 升级标准

- 保留原 id 和核心玩法，玩起来更有深度、挑战，也更好玩。
- 必须补齐：
  - 首玩教学；
  - 至少 10 关，或者难度递增的无尽模式；
  - 有意义的选择；
  - 成长和解锁（存在 localStorage，兼容原来的存档键）；
  - 真实的难度曲线；
  - Boss 或特殊机制；
  - 暂停、重开、最佳纪录；
  - 音效；
  - 切到后台时自动暂停；
  - 按钮不小于 44px。
- 画面用方案 B 共用皮肤，加上 `GameUI.fx` 立体效果。
- `meta.json` 的整数 version 加 1，studio 保持原样。
- 验证：
  - `sync-game-ui --check --strict` 和 `check-game.cjs` 都要通过；
  - 在 390×844 和 360×640 下无头打开，没有报错；
  - 用脚本模拟游玩，确认第 1 关能过、后面的关更难、赢和输都能触发。
- 跳过规则：当天下午 3 点「每日画面升级一批」要改的游戏先跳过，等那个批次合入后再升级。批次表见 [皮肤 B 上线记录](ui-skin-b-2026-10-20.md)。
- 排序依据：用脚本扫一遍代码，看有没有教程、关卡、选关、首领、星级、解锁、无尽模式、切后台暂停、音效、暂停、立体效果、存档，再结合代码量算出分数。分数越低越优先。

## 进度

- 一共 **346** 款（相对此前文档的 328：10-29 每日新增 10 款 + edu/3D/金融扩展 8 款）。
- 已完成 **202** 款：
  - Grok 出品 20 款；
  - 10-21 升级的 11 款；
  - 每日任务升级的 90 款（10-21～10-29 各 10 款）；
  - 10-22 每日新游戏 2 款（gunslinger、lasso）；
  - 10-23 记入的新复杂游戏 8 款（cactus、drawpoker、goldrush、horseshoe、minetrack、safecrack、saltpan、steamlab）；
  - 10-24 每日新游戏 10 款（arrowescape、catrealm、colorgate、yarnloop、sandfill、parkexit、busqueue、ropetangle、gravityflip、cookrush，按新游戏标准，不进队列）；
  - 10-25 每日新游戏 10 款（hexwar、seatpref、dominofall、factoryline、spellcraft、railtycoon、curlingduel、tenpair、swarmcmd、cryptops，按新游戏标准，不进队列）；
  - 10-26 每日新游戏 10 款（autochess、beatraid、gearbox、gemquest、goai、kingcard、neoncity、orbquest、surgetd、turncrawl，按新游戏标准，不进队列）；
  - 10-27 每日新游戏 10 款（frostpath、relicdeck、orbitcmd、potionline、pulsebeat、lightmaze、shogiduel、siegecast、floramerge、stealthgrid，按新游戏标准，不进队列）；
  - 10-28 每日新游戏 10 款（hexasort、sanddrop、tidyroom、landgrab、mobgate、fruithole、pitballs、phasecards、tripeaks、crazyeight，按新游戏标准，不进队列）；
  - 10-28 金融益智样例 3 款（marginlab、longshort、basisstruct，按新游戏标准，不进队列）；
  - 10-29 每日新游戏 10 款（agewar、kinggrid、draftduel、vineclimb、millchess、fusionlab、fleetcmd、nestcraft、punchcombo、crystalmine，按新游戏标准，不进队列）；
  - 10-29 edu/3D/金融扩展 8 款（gravmaze、beamscale、tiltorbit、settlelab、callmargin、hedgelab、interestlab、pitchlab，按新游戏标准，不进队列）。
- 还剩 **144** 款。

### 2026-10-29（第 9 批）

| id | 名称 | 主要改进 |
|---|---|---|
| copter | 直升机 | 15 关飞过峡谷缺口：缺口更窄、速度更快；第 5/10/15 关峡谷风暴/双壁夹击/终末裂谷；可升级转子推力、护盾、额外命 |
| deepdive | 深潜 | 15 关下潜捡珍珠：目标加深、鲨鱼更多更快；第 5/10/15 关深渊巨鲨/双鲨围猎/海神守卫鲨；可升级氧气、灯、额外命 |
| jellyzap | 电鳗伏击 | 15 关蓄电电击捕鱼：目标分数升；第 5/10/15 关狂鲨潮/电风暴鲨/深渊电鲨王；可升级蓄电、范围、额外命 |
| paperfly | 纸飞机 | 15 关滑翔飞远：目标距离升、鸟更密；第 5/10/15 关鸟群风暴/双翼狂潮/终末鸟墙；可升级滑翔、护盾、额外命 |
| pearlcatch | 珍珠贝 | 15 关点开珍珠：目标升、限时更紧、螃蟹更多；第 5/10/15 关蟹将军潮/双钳蟹王/深渊蟹魔；可升级加时、提示、额外命 |
| rocketlab | 火箭原理 | 15 关气球/水火箭调参命中：容差收紧；第 5/10/15 关风暴靶台/移动靶王/极端终靶；可升级精密、多试、提示 |
| simon | 记忆节拍 | 15 关 Simon 记序列：轮次升、色块更多更快；第 5/10/15 关乱序闪影/双闪风暴/终极乱拍；可升级慢放、提示、额外命 |
| skeleton | 骨骼拼图 | 15 关拖骨头入槽：块数升、干扰与限时；第 5/10/15 关迷雾骨影/乱骨魔/终极骨魔；可升级提示、加时、额外命 |
| sonar | 声呐寻宝 | 15 关声呐三角定位：ping 更少、噪声更大；第 5/10/15 关干扰回波/幽灵回波/深渊假回波；可升级多 Ping、雷达、额外命 |
| archery | 神射手 | 15 关拉弓射靶：目标环分升、靶移动缩小有风；第 5/10/15 关移动靶王/疾风靶魔/终末靶神；可升级稳手、多箭、额外命 |

- 都是 15 关，含首玩教程、选关星级、金币升级、第 5/10/15 关首领、暂停/重开/最佳纪录、音效、切后台自动暂停；进度存在 `g100_<id>_prog`。
- 今日跳过画面批次 T2-5（下午 15:00）：floodit、duckhunt、lumber、ski、snowman、catch、pop、icecurl、draw、snowflake、digdug、sleigh、snowbros、iceslide、link、yeti、snowplow、icebridge（勿与可玩性升级冲突）。

### 2026-10-28（第 8 批）

| id | 名称 | 主要改进 |
|---|---|---|
| moonphase | 月相拼图 | 15 关交换还原：块数 4→8、步数更紧；第 5/10/15 关时移月影/逆序月潮/蚀影月魔；可升级提示、加步、额外命 |
| spintop | 打陀螺 | 15 关抽鞭对决：对手旋力升、圈更小；第 5/10/15 关铁甲陀王/狂转魔螺/终极螺神；可升级鞭力、稳旋、额外命 |
| swordparry | 剑气格挡 | 15 关四向格挡：速度升、多剑同发；第 5/10/15 关四向乱斩/影刃连斩/终极剑魔；可升级窗宽、护盾、额外命 |
| jetpack | 喷气背包 | 15 关按住升空躲导弹：距离与密度升；第 5/10/15 关追踪弹潮/齐射风暴/终末导弹雨；可升级推力、护盾、额外命 |
| rhythm | 节奏拍 | 15 关多轨点按：BPM/轨道升；第 5/10/15 关疾速节拍/双押风暴/终极狂想曲；可升级判定、连击盾、额外命 |
| trapeze | 空中飞人 | 15 关荡杠接力抓金环：间距与摆幅升；第 5/10/15 关乱摆棚王/双环狂潮/终极大棚；可升级抓距、金环磁、额外命 |
| zuma | 祖玛 | 15 关射球三消：颜色与链速升；第 5/10/15 关铁球潮/彩虹灾厄/祖玛魔王；可升级慢速、换球、额外命 |
| acidbase | 酸碱中和 | 15 关滴定找中和点：容差收紧、多份样品；第 5/10/15 关缓冲液怪/双指示剂/滴定魔王；可升级精密、慢滴、额外命 |
| bigfish | 大鱼吃小鱼 | 15 关吃小长大：目标体型与大鱼数升；第 5/10/15 关鲨鱼潮/双霸主/深渊巨口；可升级加速、护盾、额外命 |
| catapult | 投石车 | 15 关蓄力抛石砸城：距离/风力/移动城；第 5/10/15 关铁壁堡垒/移动堡王/终极大城；可升级多石、抗风、额外命 |

- 都是 15 关，含首玩教程、选关星级、金币升级、第 5/10/15 关首领、暂停/重开/最佳纪录、音效、切后台自动暂停；进度存在 `g100_<id>_prog`。
- 今日跳过画面批次 T2-4（下午 15:00）：jellyzap、paperfly、sonar、broomrace、lighthouse、tideseek、penalty、shellswap、pyramid、seacannon、spelldraw、waiter、shuttle、ballroll、dungeonkey、frost、spacelevator、starmail（勿与可玩性升级冲突）。ascent/inkspray/hoop 已升级，不在本批。

### 2026-10-27（第 7 批）

| id | 名称 | 主要改进 |
|---|---|---|
| darts | 飞镖 | 15 关蓄力掷镖打靶：环数目标升、靶移动/旋转；第 5/10/15 关移动靶王/旋转靶魔/终极镖神靶；可升级准星、多镖、额外命 |
| peg | 孔明棋 | 15 关跳吃：棋盘 5→7、剩余目标与步数更紧；第 5/10/15 关限步迷阵/十字死局/孔明终章；可升级撤销、提示、加步 |
| reversi | 黑白棋 | 15 关人机对战：AI 加深、翻转分与限时；第 5/10/15 关让子棋王/限时智者/终极棋魔；可升级洞察、加时、额外命 |
| staticlab | 静电实验 | 15 关摩擦起电吸纸屑：电荷与目标升；第 5/10/15 关潮湿漏电 Boss；可升级强电、多擦、额外命 |
| collapse | 方块消消 | 15 关连块消除：目标分/限时/板更大；第 5/10/15 关障碍石潮/铁壁/终极崩塌；可升级加时、重排、额外命 |
| flappy | 笨鸟先飞 | 15 关穿越水管：管距收紧、速度升；第 5/10/15 关摇摆/双口/深渊管魔；可升级浮力、护盾、额外命 |
| fruitbattery | 水果电池 | 15 关原电池串联点亮：电压目标升；第 5/10/15 关内阻干扰 Boss；可升级精密、容差、多试 |
| hoop | 投篮 | 15 关蓄力投篮：篮筐移动与风力；第 5/10/15 关远距移动筐 Boss；可升级多球、抗风、额外命 |
| inkspray | 章鱼喷墨 | 15 关喷墨打蟹：密度与血量升；第 5/10/15 关蟹将军/双钳蟹王/深渊蟹魔；可升级射速、墨量、额外命 |
| mastermind | 密码破译 | 15 关色码破译：位数/色数/次数收紧；第 5/10/15 关暗影/迷雾/终极暗码；可升级加次、容重、提示 |

- 都是 15 关，含首玩教程、选关星级、金币升级、第 5/10/15 关首领、暂停/重开/最佳纪录、音效、切后台自动暂停；进度存在 `g100_<id>_prog`。
- 今日跳过画面批次 T2-3（下午 15:00）：piano、plumpile、pottery、rhythm、shellgame、slingshot、spintop、swordlane、swordparry、towerdef、trapeze、tugwar、volcano、aurora、debrisweep、docking、jetpack、lunarlander、missile、mooncrawl、moonphase、orbit、rocket、shieldguard（勿与可玩性升级冲突）。darts 的 T2-2 已于 10-26 完成，本批已升级。

### 2026-10-26（第 6 批）

| id | 名称 | 主要改进 |
|---|---|---|
| pulley | 滑轮组 | 15 关省力起重：配重与摩擦递增；第 5/10/15 关卡滞巨轮/双滑轮锁死/终极大轮 Boss；可升级润滑、拉力、额外命 |
| slot | 拉霸 | 15 关拉霸连线：赔率表与免费旋转目标升；第 5/10/15 关大奖风暴/双轴狂潮/拉霸魔王；可升级权重、多币、加时 |
| indicator | 酸碱指示剂 | 15 关滴液变色判 pH：干扰色与时限收紧；第 5/10/15 关缓冲液怪/双指示剂/滴定魔；可升级精密、加时、提示 |
| invaders | 太空侵略者 | 15 关清剿舰队：行列与射速升；第 5/10/15 关飞碟母舰/铁甲旗舰/终极侵略王；可升级射速、护盾、额外命 |
| orbit | 轨道躲避 | 15 关内外轨切换躲陨石：存活时长升；第 5/10/15 关引力阱核/双星风暴/坍缩黑洞；可升级护盾、慢时、额外命 |
| snowball | 雪球大战 | 15 关抛物线投雪球打靶：靶更小更快；第 5/10/15 关雪人王/冰霜巨像/暴风雪魔；可升级雪球、加时、额外命 |
| volcano | 火山逃生 | 15 关跳台逃离上涨熔岩：台更窄更晃；第 5/10/15 关熔岩巨兽/双峰喷发/火山魔神落石；可升级弹跳、护盾、额外命 |
| ascent | 深海归途 | 15 关上浮归途：障碍更密、耗氧；第 5/10/15 关深渊巨兽/幽灵水母群/海神守卫；可升级氧气、护盾、额外命 |
| lightsout | 熄灯 | 15 关灯光谜题：棋盘 3→6、步数更紧；第 5/10/15 关混沌闪烁/双色乱码/终末霓虹；可升级加步、撤销、提示 |
| microscopelab | 显微镜 | 15 关显微找细胞：倍率与干扰升；第 5/10/15 关变异菌落/超级病菌/终极病原体；可升级视野、染色、加时、命 |

- 都是 15 关，含首玩教程、选关星级、金币升级、第 5/10/15 关首领、暂停/重开/最佳纪录、音效、切后台自动暂停；进度存在 `g100_<id>_prog`。
- 今日跳过 darts（飞镖）：预期画面批次 T2-2（下午 15:00），勿与可玩性升级冲突。

### 2026-10-25（第 5 批）

| id | 名称 | 主要改进 |
|---|---|---|
| resonance | 共振实验 | 15 关调音叉找共振：容差收紧、多音叉与漂移；第 5/10/15 关混沌/双峰/终极共鸣 Boss；可升级精密、加时、额外命 |
| tetris | 俄罗斯方块 | 15 关堆叠消行：目标行数与落速递增；第 5/10/15 关垃圾潮/迷雾/深渊堆叠王；可升级慢落、存块；保留经典手感 |
| airhockey | 气垫球 | 15 关气垫球对战 AI：球速与反应升；第 5/10/15 关双拍幽灵/磁暴守门/终极冰球王；可升级拍径、控球、额外局 |
| bubbletea | 奶茶摇摇 | 15 关按订单选料摇匀：配方更复杂、限时更紧；第 5/10/15 关高峰狂潮/难缠食客/奶茶魔王；可升级摇稳、加时、容错 |
| bumpercar | 碰碰车 | 15 关竞技场撞晕：对手更多更野；第 5/10/15 关铁甲巨轮/双头碰碰/终极碰碰王；可升级加速、撞击、护盾 |
| claw | 抓娃娃 | 15 关娃娃机时机抓取：娃娃移动更快、币更少；第 5/10/15 关金牌熊王/彩虹稀有/终极娃娃魔；可升级爪力、多币、瞄准 |
| dig | 挖宝 | 15 关网格挖宝：格子更大、陷阱更多、步数更紧；第 5/10/15 关诅咒宝箱/暗影矿脉/深渊宝库魔；可升级多步、雷达、命 |
| dino | 小恐龙跑酷 | 15 关跑酷冲刺：速度与障碍密度升；第 5/10/15 关翼龙群/双翼暴君/史前终章；可升级多段跳、护盾、额外命 |
| dragonegg | 龙蛋孵化 | 15 关控温孵化：适宜温区收窄、天气干扰；第 5/10/15 关冰火双生蛋/风暴龙巢/远古龙王蛋；可升级温稳、预警、命 |
| periodic | 元素周期表 | 15 关元素问答：题量增、干扰更像、时限紧；第 5/10/15 关神秘元素/同位素幻影/周期表守护者；可升级提示、加时、命 |

- 都是 15 关，含首玩教程、选关星级、金币升级、第 5/10/15 关首领、暂停/重开/最佳纪录、音效、切后台自动暂停；进度存在 `g100_<id>_prog`。
- 今日画面批次预期为 T2-1（acidbase、buoyancy、cellstruct 等），与本批 10 款无重叠，全部升级，无跳过。

### 2026-10-24（第 4 批）

| id | 名称 | 主要改进 |
|---|---|---|
| frogger | 青蛙过河 | 15 关过马路过河：车速/车道与浮木间隙递增；第 5/10/15 关河岸鳄/潮汐鳄王/深渊巨鳄咬岸；可升级额外命、慢动作、安全提示；保留 T1-2 霓虹浮木与车体 |
| piano | 钢琴块 | 15 关只点黑块：速度与密度升，漏点/点白扣命；第 5/10/15 关双轨曲谱 Boss；可升级容错、减速、连击护盾 |
| punnett | 遗传棋盘 | 15 关 Punnett 方格：选基因型计数或显隐表型比，干扰项增多；第 5/10/15 关突变豌豆翻转显隐性；可升级提示、加时、双倍币 |
| racing | 狂野赛车 | 15 关变道躲车冲里程：油桶护盾/硝基；第 5/10/15 关街头车霸贴身逼车；可升级护盾、宽道感、硝基时长；保留 T1-2 霓虹车道 |
| snake | 贪吃蛇 | 15 关吃到目标长度：障碍增多、加速；第 5/10/15 关影蛇/双头蛇对撞；可升级慢速、穿墙、额外命；保留经典手感与霓虹蛇身 |
| doodle | 涂鸦跳 | 15 关冲高度：移动台/碎台/弹簧；第 5/10/15 关怪物追击可踩踏；可升级弹簧力、护盾、宽平台；保留 T1-2 立体平台 |
| hexduel | 巫师决斗 | 15 关火/水/风克制决斗：读招、蓄力、连击窗；第 5/10/15 关多血条巫师；可升级洞察、护盾、连击窗 |
| jump | 跳一跳 | 15 关蓄力跳台：台距与宽度收紧；第 5/10/15 关移动巨型台；可升级蓄力提示、容差、额外命；保留 T1-2 企鹅与金心台 |
| phtest | pH试纸 | 15 关比色读 pH：混合样取平均；第 5/10/15 关酸雨怪漂移 pH；可升级精密、加时、提示 |
| pong | 乒乓对战 | 15 关对战 AI 先到 N 分：球速与 AI 反应升，道具变大/减速；第 5/10/15 关双拍/分身 Boss；可升级拍宽、球控、额外局；保留 T1-1 霓虹球拍 |

- 都是 15 关，含首玩教程、选关星级、金币升级、第 5/10/15 关首领、暂停/重开/最佳纪录、音效、切后台自动暂停；进度存在 `g100_<id>_prog`。
- 今天跳过了画面批次 T1-3：slice、fishing、tank、plane、columns、bowling、golf、gomoku、xiangqi、solitaire（下午 15:00 画面批次，勿与可玩性升级冲突）。

### 2026-10-23（第 3 批）

| id | 名称 | 主要改进 |
|---|---|---|
| pinball | 弹珠台 | 15 关弹珠台：多挡板、弹射器、连击加分；目标撞击数递增；第 5/10/15 关首领球；金币升级弹力/球数/挡板 |
| pottery | 陶艺拉坯 | 15 关拉坯订单：上下滑动塑形匹配器型百分比；轮盘加速、粗细工具；第 5/10/15 关碎陶怪震坯；可升级软泥与加时 |
| projectile | 抛物线实验 | 15 关炮弹打靶：调角度与初速，侧风与移动靶；预瞄虚线；第 5/10/15 关铁甲靶王；可升级弹药与抗风 |
| spring | 弹簧振子 | 15 关胡克定律题：F=kx、周期 T=2π√(m/k)，调 k/m/振幅作答；第 5/10/15 关弹簧怪；可升级精密与加时 |
| cellstruct | 细胞结构 | 15 关细胞器辨认：在动/植物细胞图中点出目标并选功能；有诱饵；第 5/10/15 关病毒核吞噬细胞器 |
| fruitmerge | 水果合成 | 15 关合成目标：重力堆叠合成到指定水果等级，偶有炸弹果；第 5/10/15 关水果鬼王；可升级掉落次数 |
| mitosis | 细胞分裂 | 15 关分裂训练：按前期→中期→后期→末期→胞质排序，或辨认时期图；后期按钮会打乱；第 5/10/15 关突变核 |
| parachute | 极限跳伞 | 15 关精准着陆：自由落体开伞、左右倾斜，靶心容差收紧并有移动靶与风；第 5/10/15 关航母甲板 |
| pendulum | 单摆实验 | 15 关周期测量：释放测 T=2π√(L/g) 或反推摆长；小角度近似；第 5/10/15 关时空摆怪会改重力倍数 |
| photosynthesis | 光合作用 | 15 关产氧订单：调光照/CO₂/温度/水分，速率由最短板决定；有条件锁定与漂移；第 5/10/15 关乌云怪遮光 |

- 都是 15 关，含首玩教程、选关星级、金币升级、第 5/10/15 关首领、暂停/重开/最佳纪录、音效、切后台自动暂停；进度存在 `g100_<id>_prog`。
- 今天跳过了 frogger（以及 jewel、racing、donkeykong、bomberman、airhockey、stack、doodle、jump、cutrope）：它们在今天下午 15:00 的画面批次 T1-2 里，等合入后再升级。

### 2026-10-22（第 2 批）

| id | 名称 | 主要改进 |
|---|---|---|
| breakout | 打砖块 | 15 关砖阵：数字硬砖、打不碎的钢砖、炸掉一圈的爆炸砖、必掉道具砖；道具有加宽、多球、激光自动开火、减速、加命；连击加分；第 5/10/15 关首领会左右移动并开火麻痹挡板、召唤砖块；画面沿用 T1-1 的霓虹网格台面、发光挡板与拖尾光球 |
| electromagnet | 电磁铁 | 改成电磁起重站：调线圈匝数和电流，按订单恰好吸起指定数量的回形针；电流越大越烫，过热烧坏；首领「磁暴怪」扰乱线圈 |
| lens | 凸透镜成像 | 改成光屏猎手：挪蜡烛（物距）、选透镜（焦距），让像清晰落在光屏上或得到指定放大率；首领「模糊魔」推着光屏来回跑 |
| ohm | 欧姆定律 | 改成城市电工：调电压和电阻给每台设备配电流（I=U/R），用电表侦破未知电阻；电流过大保险丝熔断；首领「电涌怪」制造电压浪涌 |
| reflection | 光的反射 | 改成激光迷阵：调激光角度在镜子间反弹，点亮全部水晶，↩ 水晶必须用反射光点亮；首领「暗影镜妖」躲在镜阵里 |
| seriesparallel | 串联与并联 | 改成舞台灯光设计：把灯泡分到不同支路（支路并联、支路内串联），让每盏灯达到要求亮度且不超保险丝电流；首领「断路鼠」咬断电线 |
| magnet | 磁铁实验 | 改成接物挑战：异极相吸接住磁性宝石，同极相斥弹回炸弹，左右移动、随时翻转磁极；首领「磁暴核心」 |
| refraction | 光的折射 | 改成激光狙击：按斯涅尔定律瞄准水中的鱼（看起来更浅），从水下往上射角度太大会全反射；首领「深渊章鱼」 |
| incline | 斜面实验 | 改成斜面快递站：调倾角让小车在时间窗口内滑到底，不同路面摩擦不同，易碎货物限速；首领「齿轮守门人」定时开关 |
| levitate | 悬浮术 | 15 关悬浮试炼：按住上飘、松开下落穿光环，有移动光环、荆棘球、上下风区；首领「风暴乌鸦」，穿金环放魔法弹反击 |

- 都是 15 关，含首玩教程、选关星级、金币升级（每款 2～3 项）、第 5/10/15 关首领、暂停/重开/最佳纪录、音效、切后台自动暂停；进度存在 `g100_<id>_prog`。
- 打砖块 10-21 就做好了升级稿，因为在 T1-1 画面批次里先搁置；T1-1 合入（`805ed3a`）后，在升级稿上重画了 T1-1 的全部画面元素再上线，没有退回 T1-1 的画面。
- 跳过了 frogger（青蛙过河）：在明天 15:00 的画面批次 T1-2 里。pinball（弹珠台）的 T1-1 已合入，下一批可以升级。

### 2026-10-21（第 1 批）

| id | 名称 | 主要改进 |
|---|---|---|
| memory | 记忆翻牌 | 15 关，牌桌越来越大，步数和时间越来越紧；有冰冻牌、星星对（加时并闪现答案）、炸弹对；连击计分；首领会在你失误后偷换卡牌；可升级提示卡、透视、步数和时间 |
| puzzle15 | 数字华容道 | 15 关，3×3 到 5×5，整排滑动；限步数和限时；有石块障碍；首领「暗影谜面」把数字隐身，「旋风大师」会搅乱棋盘；道具有自动走 5 步和撤回 |
| whackamole | 打地鼠 | 15 关 9→16 洞，头盔鼠、金鼠、冰冻鼠、炸弹和兔子；连击倍率；三位地鼠首领有血条 |
| gomoku | 五子棋 | 15 位棋手逐级变强（会堵活三、会预判、会算冲四杀）；有石块棋盘、每手限时、电脑先手；点两下落子防误触；按手数评星；可升级提示、悔棋和思考时间 |
| minesweeper | 扫雷 | 15 关，雷区越来越大越来越密，还有限时；第一下必安全；长按插旗，点数字快速翻开；💎 宝石加时，⏰ 定时雷要在引信烧完前插旗；首领关布满定时雷；有护盾和雷达道具 |
| game2048 | 2048 | 15 关，目标从 128 到 1024，有的关限步数；有石块和万能星；首领会冰冻方块、石化空格；道具有撤回和锤子，还能升级幸运开局 |
| balloon | 打气球 | 15 关，弹匣与装弹的取舍、同色连击倍率、7 种气球（盔甲/金/冰冻/分裂/彩虹/炸弹）、逃走上限；3 艘会扔炸弹和开护盾的飞艇首领 |
| tank | 坦克大战 | 15 关地图，4 种敌车（快速/重甲/炮击）、水面和草丛、闪光敌车掉 6 种道具、⭐ 三级火力能打穿钢墙；3 辆巨型首领坦克 |
| prism | 三棱镜色散 | 改成光路谜题：按斯涅尔定律算真实偏向角，调入射角、选玻璃（冕牌/火石/重火石），让指定颜色射进接收器；有挡板、全反射、最小偏向角；3 场移动的吞光魔首领战 |
| circuit | 简单电路 | 改成串联电路谜题：I=U÷R 让灯泡、LED、电机、蜂鸣器同时正常工作；电池和 LED 有方向，保险丝、短路、烧坏零件；3 场限时多轮的停电怪首领战 |

- 跳过了 breakout（打砖块）：它在今天下午 3 点的画面批次 T1-1 里。升级稿已经做好，等 T1-1 合入后再合并上线。
- 这 10 款共用同一套关卡、教程和存档套件：
  - 进度存在 `g100_<id>_prog`；
  - 最高分沿用原来的 `g100_<id>_hs`。

### 已完成（标准达标，不再排队）

- **Grok 出品**：abysscrawl、arrowrogue、bagbrawl、beatblade、chesslord、fatespire、gardenguard、gemhero、hexrealm、islelord、jokerpoker、landlord、marblerun、mechbreach、mergelegion、metromap、neontd、shadowgo、starconquest、starswarm
- **10-21 升级**：blackjack、magrail、neodrone、neohack、neoncourier、neonfish、neonmirror、neonrunner、spinmatrix、viruslock、plumpile
- **每日任务**：memory、puzzle15、whackamole、gomoku、minesweeper、game2048、balloon、tank、prism、circuit、breakout、electromagnet、lens、ohm、reflection、seriesparallel、magnet、refraction、incline、levitate、pinball、pottery、projectile、spring、cellstruct、fruitmerge、mitosis、parachute、pendulum、photosynthesis、frogger、piano、punnett、racing、snake、doodle、hexduel、jump、phtest、pong、resonance、tetris、airhockey、bubbletea、bumpercar、claw、dig、dino、dragonegg、periodic、pulley、slot、indicator、invaders、orbit、snowball、volcano、ascent、lightsout、microscopelab、darts、peg、reversi、staticlab、collapse、flappy、fruitbattery、hoop、inkspray、mastermind、moonphase、spintop、swordparry、jetpack、rhythm、trapeze、zuma、acidbase、bigfish、catapult、copter、deepdive、jellyzap、paperfly、pearlcatch、rocketlab、simon、skeleton、sonar、archery
- **10-23 新复杂游戏**：cactus、drawpoker、goldrush、horseshoe、minetrack、safecrack、saltpan、steamlab
- **10-24 新游戏**：arrowescape、catrealm、colorgate、yarnloop、sandfill、parkexit、busqueue、ropetangle、gravityflip、cookrush
- **10-25 新游戏**：hexwar、seatpref、dominofall、factoryline、spellcraft、railtycoon、curlingduel、tenpair、swarmcmd、cryptops
- **10-26 新游戏**：autochess、beatraid、gearbox、gemquest、goai、kingcard、neoncity、orbquest、surgetd、turncrawl
- **10-27 新游戏**：frostpath、relicdeck、orbitcmd、potionline、pulsebeat、lightmaze、shogiduel、siegecast、floramerge、stealthgrid
- **10-28 新游戏**：hexasort、sanddrop、tidyroom、landgrab、mobgate、fruithole、pitballs、phasecards、tripeaks、crazyeight
- **10-28 金融益智**：marginlab、longshort、basisstruct
- **10-29 新游戏**：agewar、kinggrid、draftduel、vineclimb、millchess、fusionlab、fleetcmd、nestcraft、punchcombo、crystalmine
- **10-29 edu/3D/金融**：gravmaze、beamscale、tiltorbit、settlelab、callmargin、hedgelab、interestlab、pitchlab

## 待升级队列（按优先级，从差到好）

括号里是代码扫描分数。标了批次的游戏，在那个画面批次当天会被跳过。

（已去掉 10-29 第 9 批升级的 10 款；今日跳过 T2-5 画面批次：floodit、duckhunt、lumber、ski、snowman、catch、pop、icecurl、draw、snowflake、digdug、sleigh、snowbros、iceslide、link、yeti、snowplow、icebridge。）

1. floodit 翻色（8.5） · 画面批次 T2-5
2. broomrace 扫帚夜行（8.8） · 画面批次 T2-4
3. checkers 西洋跳棋（8.8） · 画面批次 T2-6
4. densitylab 密度实验（8.8） · 画面批次 DOM-1
5. digestion 消化之旅（8.8） · 画面批次 DOM-1
6. duckhunt 打鸭子（8.8） · 画面批次 T2-5
7. ecobottle 生态瓶（8.8） · 画面批次 DOM-1
8. freefall 自由落体（8.8） · 画面批次 T2-1
9. golf 迷你高尔夫（8.8） · 画面批次 T1-3
10. grill 烧烤王（8.8） · 画面批次 DOM-2
11. heartpump 心脏泵血（8.8） · 画面批次 T2-1
12. klotski 华容道（8.8） · 画面批次 T2-6
13. lever 杠杆平衡（8.8） · 画面批次 T2-1
14. lighthouse 灯塔引航（8.8） · 画面批次 T2-4
15. lumber 砍树工（8.8） · 画面批次 T2-5
16. maze 迷宫（8.8） · 画面批次 T2-6
17. metalreact 金属活动性（8.8） · 画面批次 DOM-1
18. potion 魔药调配（8.8） · 画面批次 DOM-1
19. pressurelab 压强实验（8.8） · 画面批次 DOM-1
20. seahorse 海马竞速（8.8） · 画面批次 DOM-1
21. shellgame 猜杯子（8.8） · 画面批次 T2-3
22. ski 滑雪（8.8） · 画面批次 T2-5
23. snowman 堆雪人（8.8） · 画面批次 T2-5
24. solitaire 纸牌接龙（8.8） · 画面批次 T1-3
25. tideseek 潮汐寻宝（8.8） · 画面批次 T2-4
26. wavelab 波的传播（8.8） · 画面批次 T2-2
27. wordsearch 找单词（8.8） · 画面批次 DOM-2
28. bowling 保龄球（9） · 画面批次 T1-3
29. buoyancy 浮力实验（9） · 画面批次 T2-1
30. expansion 热胀冷缩（9） · 画面批次 DOM-1
31. fishing 钓鱼（9） · 画面批次 T1-3
32. heattransfer 热传导（9） · 画面批次 DOM-1
33. penalty 点球（9） · 画面批次 T2-4
34. shellswap 换壳蟹（9） · 画面批次 T2-4
35. spotthediff 找不同（9） · 画面批次 DOM-2
36. catch 接金币（9.3） · 画面批次 T2-5
37. connectfour 四子棋（9.3） · 画面批次 DOM-2
38. foodchain 食物链（9.3） · 画面批次 DOM-1
39. pop 戳泡泡（9.3） · 画面批次 T2-5
40. wordle 猜单词（9.3） · 画面批次 DOM-2
41. yahtzee 快艇骰子（9.3） · 画面批次 DOM-2
42. alchemy 炼金转化（9.5） · 画面批次 DOM-1
43. collision 碰撞实验（9.5） · 画面批次 T2-1
44. domino 多米诺（9.5） · 画面批次 T2-2
45. dotsboxes 点格棋（9.5） · 画面批次 T2-6
46. friction 摩擦力实验（9.5） · 画面批次 T2-1
47. icecurl 冰壶（9.5） · 画面批次 T2-5
48. lungcap 肺活量测试（9.5） · 画面批次 T2-1
49. pyramid 跳格金字塔（9.5） · 画面批次 T2-4
50. seacannon 深海炮手（9.5） · 画面批次 T2-4
51. slice 切水果（9.5） · 画面批次 T1-3
52. spelldraw 符文施法（9.5） · 画面批次 T2-4
53. takuzu 二进制（9.5） · 画面批次 DOM-2
54. chemreact 化学反应（9.8） · 画面批次 DOM-1
55. plane 打飞机（9.8） · 画面批次 T1-3
56. battleship 海战棋（10） · 画面批次 DOM-2
57. draw 画线救援（10） · 画面批次 T2-5
58. firework 烟花（10） · 画面批次 T2-2
59. math24 24点（10） · 画面批次 DOM-2
60. riddle 灯谜（10） · 画面批次 DOM-2
61. shadowmatch 影子魔术（10） · 画面批次 DOM-1
62. shieldguard 星球护盾（10） · 画面批次 T2-3
63. sudoku 数独（10） · 画面批次 DOM-2
64. tugwar 江湖拔河（10） · 画面批次 T2-3
65. aurora 极光（10.3） · 画面批次 T2-3
66. billiards 桌球（10.3）
67. bubble 泡泡龙（10.3） · 画面批次 T1-1
68. debrisweep 太空清道夫（10.3） · 画面批次 T2-3
69. rocket 火箭（10.3） · 画面批次 T2-3
70. swordlane 剑守三关（10.3） · 画面批次 T2-3
71. teahouse 茶馆小二（10.3） · 画面批次 T2-6
72. xiangqi 象棋（10.3） · 画面批次 T1-3
73. bomber 轰炸机（10.5） · 画面批次 T2-2
74. combustion 燃烧条件（10.5） · 画面批次 T2-1
75. hanoi 汉诺塔（10.5） · 画面批次 T2-6
76. ninja 忍者（10.5） · 画面批次 T2-2
77. snowflake 雪花剪（10.5） · 画面批次 T2-5
78. solubility 溶解度（10.5） · 画面批次 T2-2
79. waiter 平稳托盘（10.5） · 画面批次 T2-4
80. farm 开心农场（10.8） · 画面批次 DOM-2
81. noodle 拉面王（10.8） · 画面批次 T2-6
82. tangram 七巧板（10.8） · 画面批次 T2-6
83. wandshop 魔杖店（10.8） · 画面批次 DOM-1
84. alienlang 外星密语（11） · 画面批次 DOM-2
85. colorlines 彩色连珠（11） · 画面批次 DOM-2
86. crystal 晶体生长（11） · 画面批次 T2-1
87. digdug 挖地（11） · 画面批次 T2-5
88. donkeykong 金刚（11） · 画面批次 T1-2
89. electrolysis 电解水（11） · 画面批次 DOM-1
90. ludo 飞行棋（11） · 画面批次 T2-6
91. missile 导弹拦截（11） · 画面批次 T2-3
92. pacman 吃豆人（11） · 画面批次 T1-1
93. shuttle 踢毽子（11） · 画面批次 T2-4
94. sleigh 雪橇（11） · 画面批次 T2-5
95. stack 叠叠乐（11） · 画面批次 T1-2
96. bomberman 炸弹人（11.3） · 画面批次 T1-2
97. cannon 炮击堡垒（11.3） · 画面批次 T2-2
98. hotpot 火锅涮（11.3） · 画面批次 T2-6
99. rotatemaze 旋转迷宫（11.3） · 画面批次 T2-6
100. snowbros 雪人兄弟（11.3） · 画面批次 T2-5
101. ballroll 滚珠入洞（11.5） · 画面批次 T2-4
102. columns 宝石列柱（11.5） · 画面批次 T1-3
103. dungeonkey 地牢钥匙（11.5） · 画面批次 T2-4
104. onestroke 一笔画（11.5） · 画面批次 T2-6
105. pizzacut 披萨刀（11.5） · 画面批次 T2-6
106. bagua 八卦转轮（11.8） · 画面批次 T2-6
107. cubhop 魔块跳跳（11.8） · 画面批次 T2-2
108. iceslide 冰滑块（11.8） · 画面批次 T2-5
109. jewel 消消乐（11.8） · 画面批次 T1-2
110. link 连连看（11.8） · 画面批次 T2-5
111. colormix 小丑调色（12） · 画面批次 DOM-1
112. eyevision 眼睛成像（12） · 画面批次 T2-1
113. cutrope 割绳子（12.3） · 画面批次 T1-2
114. frost 冰窗花（12.3） · 画面批次 T2-4
115. yeti 雪怪（12.3） · 画面批次 T2-5
116. snowplow 铲雪车（12.5） · 画面批次 T2-5
117. lunarlander 登月舱（12.8） · 画面批次 T2-3
118. mooncrawl 月球车（12.8） · 画面批次 T2-3
119. slingshot 引力弹射（12.8） · 画面批次 T2-3
120. spacelevator 太空电梯（12.8） · 画面批次 T2-4
121. towerdef 简易塔防（12.8） · 画面批次 T2-3
122. docking 太空对接（13） · 画面批次 T2-3
123. laser 激光反射（13） · 画面批次 T2-2
124. asteroid 小行星（13.3） · 画面批次 T1-1
125. flow 连连线（13.8） · 画面批次 T2-6
126. sortcandy 糖果分拣（13.8） · 画面批次 DOM-2
127. starmail 星际快递（13.8） · 画面批次 T2-4
128. pipes 水管工（14） · 画面批次 T2-6
129. nonogram 数织（14.5） · 画面批次 DOM-2
130. sokoban 推箱子（14.5） · 画面批次 DOM-2
131. touhu 投壶（14.8） · 画面批次 T2-6
132. bento 便当拼装（15.3） · 画面批次 DOM-2
133. unblock 挪车让路（15.3） · 画面批次 T2-6
134. icebridge 铺冰桥（16） · 画面批次 T2-5
135. cityskyline 都市天际线（16.5） · 画面批次 T2-2

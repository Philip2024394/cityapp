-- 0006_places_yogya_expand.sql
-- Expands the Yogyakarta places directory from ~70 to ~200 rows so the
-- /places search surface is dense enough to be useful day-one. All rows
-- are inserted with status='approved' and image_urls left empty — the UI
-- renders the existing category-gradient placeholder. Real photos arrive
-- with a later Google Places backfill or the Phase-3 owner-claim flow.
--
-- Coordinate provenance: approximate locations recalled from public
-- knowledge of well-known Yogyakarta landmarks. Suitable for routing
-- and ride-booking handoff; NOT survey-grade. A later one-shot Places
-- API backfill (when an API key is provisioned) will overwrite these
-- with verified coords + addresses + photo URLs.

insert into places (slug, name, category, description, location, lat, lng, city, address, tags, status) values

-- ─────────────────────────────────────────────────────────────────────
-- TEMPLES (10)
-- ─────────────────────────────────────────────────────────────────────
('kalasan-temple','Candi Kalasan','temple','8th-century Buddhist temple, one of the oldest in the Yogyakarta region.',ST_GeogFromText('SRID=4326;POINT(110.4724 -7.7672)'),-7.7672,110.4724,'yogyakarta','Kalibening, Tirtomartani, Kalasan, Sleman',ARRAY['tourist','outside_city'],'approved'),
('sambisari-temple','Candi Sambisari','temple','Hindu temple discovered beneath volcanic ash, partially excavated.',ST_GeogFromText('SRID=4326;POINT(110.4495 -7.7621)'),-7.7621,110.4495,'yogyakarta','Sambisari, Purwomartani, Kalasan, Sleman',ARRAY['tourist','outside_city'],'approved'),
('mendut-temple','Candi Mendut','temple','Buddhist temple housing a large Dhyani Buddha statue near Borobudur.',ST_GeogFromText('SRID=4326;POINT(110.2306 -7.6048)'),-7.6048,110.2306,'yogyakarta','Mendut, Mungkid, Magelang',ARRAY['tourist','outside_city'],'approved'),
('pawon-temple','Candi Pawon','temple','Small Buddhist temple on the line between Borobudur and Mendut.',ST_GeogFromText('SRID=4326;POINT(110.2210 -7.6063)'),-7.6063,110.2210,'yogyakarta','Brojonalan, Wanurejo, Borobudur, Magelang',ARRAY['tourist','outside_city'],'approved'),
('ijo-temple','Candi Ijo','temple','Hindu temple sited on the highest hill among Yogya temples.',ST_GeogFromText('SRID=4326;POINT(110.5119 -7.7794)'),-7.7794,110.5119,'yogyakarta','Sambirejo, Prambanan, Sleman',ARRAY['tourist','outside_city'],'approved'),
('sari-temple','Candi Sari','temple','Two-storey Buddhist temple, paired historically with Candi Kalasan.',ST_GeogFromText('SRID=4326;POINT(110.4795 -7.7625)'),-7.7625,110.4795,'yogyakarta','Bendan, Tirtomartani, Kalasan, Sleman',ARRAY['tourist','outside_city'],'approved'),
('banyunibo-temple','Candi Banyunibo','temple','Isolated Buddhist temple amid rice fields south of Ratu Boko.',ST_GeogFromText('SRID=4326;POINT(110.5025 -7.7886)'),-7.7886,110.5025,'yogyakarta','Cepit, Bokoharjo, Prambanan, Sleman',ARRAY['tourist','outside_city'],'approved'),
('sojiwan-temple','Candi Sojiwan','temple','Buddhist temple decorated with reliefs of Jataka fables.',ST_GeogFromText('SRID=4326;POINT(110.4920 -7.7596)'),-7.7596,110.4920,'yogyakarta','Kebondalem Kidul, Prambanan, Klaten',ARRAY['tourist','outside_city'],'approved'),
('barong-temple','Candi Barong','temple','Twin-temple Hindu complex on two terraces near Ratu Boko.',ST_GeogFromText('SRID=4326;POINT(110.5083 -7.7853)'),-7.7853,110.5083,'yogyakarta','Sumberwatu, Sambirejo, Prambanan, Sleman',ARRAY['tourist','outside_city'],'approved'),
('klenteng-poncowinatan','Klenteng Poncowinatan','temple','19th-century Chinese Confucian temple in central Yogyakarta.',ST_GeogFromText('SRID=4326;POINT(110.3636 -7.7861)'),-7.7861,110.3636,'yogyakarta','Jl. Poncowinatan, Yogyakarta',ARRAY['tourist'],'approved'),

-- ─────────────────────────────────────────────────────────────────────
-- BEACHES (12) — all Gunungkidul / Kulon Progo, outside_city
-- ─────────────────────────────────────────────────────────────────────
('sundak-beach','Pantai Sundak','beach','Calm white-sand beach with a cave at its western end.',ST_GeogFromText('SRID=4326;POINT(110.6133 -8.1547)'),-8.1547,110.6133,'yogyakarta','Sidoharjo, Tepus, Gunungkidul',ARRAY['tourist','outside_city'],'approved'),
('sadranan-beach','Pantai Sadranan','beach','Snorkelling-friendly white-sand beach with shallow reef.',ST_GeogFromText('SRID=4326;POINT(110.6201 -8.1543)'),-8.1543,110.6201,'yogyakarta','Sidoharjo, Tepus, Gunungkidul',ARRAY['tourist','outside_city'],'approved'),
('kukup-beach','Pantai Kukup','beach','Beach with a rocky islet linked by a pedestrian bridge.',ST_GeogFromText('SRID=4326;POINT(110.5573 -8.1359)'),-8.1359,110.5573,'yogyakarta','Kemadang, Tanjungsari, Gunungkidul',ARRAY['tourist','outside_city'],'approved'),
('pok-tunggal-beach','Pantai Pok Tunggal','beach','Secluded beach known for its iconic single tree on the sand.',ST_GeogFromText('SRID=4326;POINT(110.6438 -8.1862)'),-8.1862,110.6438,'yogyakarta','Tepus, Gunungkidul',ARRAY['tourist','outside_city'],'approved'),
('ngrenehan-beach','Pantai Ngrenehan','beach','Fishing-village beach with traditional boats and seafood stalls.',ST_GeogFromText('SRID=4326;POINT(110.4926 -8.1413)'),-8.1413,110.4926,'yogyakarta','Kanigoro, Saptosari, Gunungkidul',ARRAY['tourist','outside_city'],'approved'),
('wediombo-beach','Pantai Wediombo','beach','Wide bay popular for surfing and dramatic sunsets.',ST_GeogFromText('SRID=4326;POINT(110.6852 -8.1864)'),-8.1864,110.6852,'yogyakarta','Jepitu, Girisubo, Gunungkidul',ARRAY['tourist','outside_city'],'approved'),
('jungwok-beach','Pantai Jungwok','beach','Quiet white-sand bay east of Wediombo, accessed on foot.',ST_GeogFromText('SRID=4326;POINT(110.6912 -8.1933)'),-8.1933,110.6912,'yogyakarta','Jepitu, Girisubo, Gunungkidul',ARRAY['tourist','outside_city'],'approved'),
('watu-kodok-beach','Pantai Watu Kodok','beach','White-sand beach named for a frog-shaped rock at the shoreline.',ST_GeogFromText('SRID=4326;POINT(110.5651 -8.1424)'),-8.1424,110.5651,'yogyakarta','Kemadang, Tanjungsari, Gunungkidul',ARRAY['tourist','outside_city'],'approved'),
('sepanjang-beach','Pantai Sepanjang','beach','Long stretch of sand with tide pools and beachside cafés.',ST_GeogFromText('SRID=4326;POINT(110.5934 -8.1495)'),-8.1495,110.5934,'yogyakarta','Kemadang, Tanjungsari, Gunungkidul',ARRAY['tourist','outside_city'],'approved'),
('glagah-beach','Pantai Glagah','beach','Wide black-sand beach with concrete tetrapod breakwaters.',ST_GeogFromText('SRID=4326;POINT(110.0710 -7.9091)'),-7.9091,110.0710,'yogyakarta','Glagah, Temon, Kulon Progo',ARRAY['tourist','outside_city'],'approved'),
('ngobaran-beach','Pantai Ngobaran','beach','Beach with a Hindu temple set among seaweed-covered rocks.',ST_GeogFromText('SRID=4326;POINT(110.4882 -8.1432)'),-8.1432,110.4882,'yogyakarta','Kanigoro, Saptosari, Gunungkidul',ARRAY['tourist','outside_city'],'approved'),
('siung-beach','Pantai Siung','beach','Beach surrounded by limestone cliffs, popular for rock climbing.',ST_GeogFromText('SRID=4326;POINT(110.6586 -8.1972)'),-8.1972,110.6586,'yogyakarta','Purwodadi, Tepus, Gunungkidul',ARRAY['tourist','outside_city'],'approved'),

-- ─────────────────────────────────────────────────────────────────────
-- ATTRACTIONS (23) — museums, viewpoints, parks
-- ─────────────────────────────────────────────────────────────────────
('affandi-museum','Museum Affandi','attraction','Riverside museum and former home of expressionist painter Affandi.',ST_GeogFromText('SRID=4326;POINT(110.3961 -7.7821)'),-7.7821,110.3961,'yogyakarta','Jl. Laksda Adisucipto No.167, Yogyakarta',ARRAY['tourist'],'approved'),
('ullen-sentalu-museum','Museum Ullen Sentalu','attraction','Private museum of Javanese Mataram-era culture in Kaliurang.',ST_GeogFromText('SRID=4326;POINT(110.4216 -7.6131)'),-7.6131,110.4216,'yogyakarta','Jl. Boyong, Kaliurang, Pakem, Sleman',ARRAY['tourist','outside_city'],'approved'),
('sonobudoyo-museum','Museum Sonobudoyo','attraction','Major collection of Javanese arts, antiquities and wayang puppets.',ST_GeogFromText('SRID=4326;POINT(110.3645 -7.8024)'),-7.8024,110.3645,'yogyakarta','Jl. Pangurakan No.6, Yogyakarta',ARRAY['tourist'],'approved'),
('benteng-vredeburg','Benteng Vredeburg','attraction','Dutch colonial fort converted into an independence-era museum.',ST_GeogFromText('SRID=4326;POINT(110.3658 -7.8011)'),-7.8011,110.3658,'yogyakarta','Jl. Margo Mulyo No.6, Yogyakarta',ARRAY['tourist'],'approved'),
('gumuk-pasir-parangkusumo','Gumuk Pasir Parangkusumo','attraction','Rare tropical coastal sand dunes south of the city.',ST_GeogFromText('SRID=4326;POINT(110.3231 -8.0211)'),-8.0211,110.3231,'yogyakarta','Parangtritis, Kretek, Bantul',ARRAY['tourist','outside_city'],'approved'),
('goa-jomblang','Goa Jomblang','attraction','Vertical sinkhole cave with a famous shaft of midday sunlight.',ST_GeogFromText('SRID=4326;POINT(110.6385 -8.0309)'),-8.0309,110.6385,'yogyakarta','Pacarejo, Semanu, Gunungkidul',ARRAY['tourist','outside_city'],'approved'),
('goa-pindul','Goa Pindul','attraction','Underground river cave with guided tubing tours.',ST_GeogFromText('SRID=4326;POINT(110.6471 -7.9329)'),-7.9329,110.6471,'yogyakarta','Bejiharjo, Karangmojo, Gunungkidul',ARRAY['tourist','outside_city'],'approved'),
('hutan-pinus-pengger','Hutan Pinus Pengger','attraction','Pine forest viewpoint with photo installations in Bantul.',ST_GeogFromText('SRID=4326;POINT(110.4374 -7.9128)'),-7.9128,110.4374,'yogyakarta','Terong, Dlingo, Bantul',ARRAY['tourist','outside_city'],'approved'),
('bukit-bintang-patuk','Bukit Bintang Patuk','attraction','Roadside hillside viewpoint over the lights of Yogyakarta.',ST_GeogFromText('SRID=4326;POINT(110.5063 -7.8517)'),-7.8517,110.5063,'yogyakarta','Patuk, Gunungkidul',ARRAY['tourist','outside_city','open_late'],'approved'),
('obelix-hills','Obelix Hills','attraction','Hilltop viewpoint near Prambanan with themed installations.',ST_GeogFromText('SRID=4326;POINT(110.5083 -7.7660)'),-7.7660,110.5083,'yogyakarta','Sambirejo, Prambanan, Sleman',ARRAY['tourist','outside_city'],'approved'),
('tebing-breksi','Tebing Breksi','attraction','Carved limestone cliff park with amphitheatre stage.',ST_GeogFromText('SRID=4326;POINT(110.5106 -7.7826)'),-7.7826,110.5106,'yogyakarta','Sambirejo, Prambanan, Sleman',ARRAY['tourist','outside_city'],'approved'),
('kaliurang','Kaliurang','attraction','Hill-resort village on the southern slope of Mount Merapi.',ST_GeogFromText('SRID=4326;POINT(110.4191 -7.6066)'),-7.6066,110.4191,'yogyakarta','Hargobinangun, Pakem, Sleman',ARRAY['tourist','outside_city'],'approved'),
('merapi-lava-tour','Merapi Lava Tour','attraction','Jeep tours through villages affected by the 2010 Merapi eruption.',ST_GeogFromText('SRID=4326;POINT(110.4470 -7.6101)'),-7.6101,110.4470,'yogyakarta','Umbulharjo, Cangkringan, Sleman',ARRAY['tourist','outside_city'],'approved'),
('stonehenge-cangkringan','Stonehenge Cangkringan','attraction','Replica stone-circle photo spot on Merapi''s southern slope.',ST_GeogFromText('SRID=4326;POINT(110.4533 -7.6189)'),-7.6189,110.4533,'yogyakarta','Petung, Kepuharjo, Cangkringan, Sleman',ARRAY['tourist','outside_city'],'approved'),
('embung-nglanggeran','Embung Nglanggeran','attraction','Hilltop reservoir ringed by orchards with mountain views.',ST_GeogFromText('SRID=4326;POINT(110.5390 -7.8454)'),-7.8454,110.5390,'yogyakarta','Nglanggeran, Patuk, Gunungkidul',ARRAY['tourist','outside_city'],'approved'),
('gunung-api-nglanggeran','Gunung Api Purba Nglanggeran','attraction','Ancient volcanic dome with hiking trails and geopark.',ST_GeogFromText('SRID=4326;POINT(110.5398 -7.8410)'),-7.8410,110.5398,'yogyakarta','Nglanggeran, Patuk, Gunungkidul',ARRAY['tourist','outside_city'],'approved'),
('air-terjun-sri-gethuk','Air Terjun Sri Gethuk','attraction','Multi-tier waterfall reached by raft along the Oyo River.',ST_GeogFromText('SRID=4326;POINT(110.5471 -7.9325)'),-7.9325,110.5471,'yogyakarta','Bleberan, Playen, Gunungkidul',ARRAY['tourist','outside_city'],'approved'),
('kalibiru','Kalibiru','attraction','Treetop platforms over a forested reservoir in Kulon Progo.',ST_GeogFromText('SRID=4326;POINT(110.1310 -7.7919)'),-7.7919,110.1310,'yogyakarta','Hargowilis, Kokap, Kulon Progo',ARRAY['tourist','outside_city'],'approved'),
('punthuk-setumbu','Punthuk Setumbu','attraction','Hilltop sunrise viewpoint overlooking Borobudur and Mt Merapi.',ST_GeogFromText('SRID=4326;POINT(110.1893 -7.6125)'),-7.6125,110.1893,'yogyakarta','Karangrejo, Borobudur, Magelang',ARRAY['tourist','outside_city'],'approved'),
('alun-alun-kidul','Alun-Alun Kidul','attraction','Southern royal square with evening food stalls and pedal-cars.',ST_GeogFromText('SRID=4326;POINT(110.3636 -7.8132)'),-7.8132,110.3636,'yogyakarta','Patehan, Kraton, Yogyakarta',ARRAY['tourist','open_late','family'],'approved'),
('museum-sandi','Museum Sandi','attraction','Indonesia''s national cryptography museum.',ST_GeogFromText('SRID=4326;POINT(110.3692 -7.7777)'),-7.7777,110.3692,'yogyakarta','Jl. FM Noto No.21, Kotabaru, Yogyakarta',ARRAY['tourist'],'approved'),
('jogja-national-museum','Jogja National Museum','attraction','Contemporary art gallery in a former art-school campus.',ST_GeogFromText('SRID=4326;POINT(110.3614 -7.7949)'),-7.7949,110.3614,'yogyakarta','Jl. Prof. Ki Amri Yahya No.1, Yogyakarta',ARRAY['tourist'],'approved'),
('sindu-kusuma-edupark','Sindu Kusuma Edupark','attraction','Family theme park with Ferris wheel north of the city centre.',ST_GeogFromText('SRID=4326;POINT(110.3553 -7.7530)'),-7.7530,110.3553,'yogyakarta','Jl. Jambon, Kricak, Tegalrejo, Yogyakarta',ARRAY['tourist','family'],'approved'),

-- ─────────────────────────────────────────────────────────────────────
-- RESTAURANTS (18)
-- ─────────────────────────────────────────────────────────────────────
('gudeg-pawon','Gudeg Pawon','restaurant','Cult-favourite gudeg warung serving from 11pm out of a home kitchen.',ST_GeogFromText('SRID=4326;POINT(110.3897 -7.8024)'),-7.8024,110.3897,'yogyakarta','Jl. Janturan No.36-38, Yogyakarta',ARRAY['halal','open_late'],'approved'),
('gudeg-bu-tjitro','Gudeg Bu Tjitro 1925','restaurant','Heritage gudeg with sealed travel packs for souvenirs.',ST_GeogFromText('SRID=4326;POINT(110.4143 -7.7847)'),-7.7847,110.4143,'yogyakarta','Jl. Janti Gedongkuning No.330, Yogyakarta',ARRAY['halal','tourist'],'approved'),
('gudeg-permata-bu-pujo','Gudeg Permata Bu Pujo','restaurant','Famous evening gudeg served under a banyan tree on Gajah Mada.',ST_GeogFromText('SRID=4326;POINT(110.3854 -7.8033)'),-7.8033,110.3854,'yogyakarta','Jl. Gajah Mada No.91, Yogyakarta',ARRAY['halal','open_late'],'approved'),
('sate-klathak-pak-bari','Sate Klathak Pak Bari','restaurant','Mutton skewers on bicycle-spoke metal at Pasar Wonokromo.',ST_GeogFromText('SRID=4326;POINT(110.3854 -7.8669)'),-7.8669,110.3854,'yogyakarta','Pasar Wonokromo, Pleret, Bantul',ARRAY['halal','outside_city'],'approved'),
('mangut-lele-mbah-marto','Mangut Lele Mbah Marto','restaurant','Smoked catfish in spicy coconut sauce cooked over a wood fire.',ST_GeogFromText('SRID=4326;POINT(110.3741 -7.8389)'),-7.8389,110.3741,'yogyakarta','Sewon, Bantul',ARRAY['halal'],'approved'),
('bakmi-kadin','Bakmi Kadin','restaurant','Heritage charcoal-fired Javanese noodle warung.',ST_GeogFromText('SRID=4326;POINT(110.3641 -7.8027)'),-7.8027,110.3641,'yogyakarta','Jl. Bintaran Kulon No.6, Yogyakarta',ARRAY['halal'],'approved'),
('bakmi-mbah-mo','Bakmi Mbah Mo','restaurant','Long-queue village noodle warung south of the city.',ST_GeogFromText('SRID=4326;POINT(110.3645 -7.9117)'),-7.9117,110.3645,'yogyakarta','Code, Trirenggo, Bantul',ARRAY['halal','outside_city'],'approved'),
('ayam-goreng-mbok-berek','Ayam Goreng Mbok Berek','restaurant','Heritage Yogyanese fried-chicken brand.',ST_GeogFromText('SRID=4326;POINT(110.4023 -7.7860)'),-7.7860,110.4023,'yogyakarta','Jl. Solo Km.7, Yogyakarta',ARRAY['halal','family'],'approved'),
('ayam-goreng-bu-tini','Ayam Goreng Bu Tini','restaurant','Family-run fried-chicken warung popular at lunch.',ST_GeogFromText('SRID=4326;POINT(110.3784 -7.7891)'),-7.7891,110.3784,'yogyakarta','Jl. Mangkubumi, Yogyakarta',ARRAY['halal'],'approved'),
('nasi-goreng-beringharjo','Nasi Goreng Beringharjo','restaurant','Late-night nasi goreng stalls beside Pasar Beringharjo.',ST_GeogFromText('SRID=4326;POINT(110.3661 -7.7991)'),-7.7991,110.3661,'yogyakarta','Jl. Pabringan, Yogyakarta',ARRAY['halal','open_late'],'approved'),
('oseng-mercon-bu-narti','Oseng Mercon Bu Narti','restaurant','Volcanic-spicy stir-fried beef tendon — the original mercon spot.',ST_GeogFromText('SRID=4326;POINT(110.3614 -7.8013)'),-7.8013,110.3614,'yogyakarta','Jl. KH Ahmad Dahlan, Yogyakarta',ARRAY['halal'],'approved'),
('jejamuran-resto','Jejamuran Resto','restaurant','Restaurant specialising entirely in mushroom dishes.',ST_GeogFromText('SRID=4326;POINT(110.3489 -7.7012)'),-7.7012,110.3489,'yogyakarta','Jl. Magelang Km.11, Sleman',ARRAY['halal','outside_city','family'],'approved'),
('sasanti-restaurant','Sasanti Restaurant','restaurant','Modern Javanese fine dining in a colonial garden setting.',ST_GeogFromText('SRID=4326;POINT(110.3760 -7.7621)'),-7.7621,110.3760,'yogyakarta','Jl. Palagan Tentara Pelajar Km.5, Sleman',ARRAY['halal','english_spoken','outside_city'],'approved'),
('milas-vegetarian','Milas Vegetarian','restaurant','Vegetarian café and youth-employment social enterprise.',ST_GeogFromText('SRID=4326;POINT(110.3686 -7.8155)'),-7.8155,110.3686,'yogyakarta','Jl. Prawirotaman IV No.127B, Yogyakarta',ARRAY['english_spoken','vegetarian','tourist'],'approved'),
('aglioo-pizza','Aglioo! Pizza','restaurant','Wood-fired pizza popular with expats in Tirtodipuran.',ST_GeogFromText('SRID=4326;POINT(110.3656 -7.8089)'),-7.8089,110.3656,'yogyakarta','Jl. Tirtodipuran, Yogyakarta',ARRAY['english_spoken','tourist'],'approved'),
('es-krim-tip-top','Es Krim Tip Top','restaurant','Dutch-era ice-cream parlour, a Yogyakarta institution.',ST_GeogFromText('SRID=4326;POINT(110.3658 -7.7900)'),-7.7900,110.3658,'yogyakarta','Jl. Pangeran Mangkubumi, Yogyakarta',ARRAY['halal','family','tourist'],'approved'),
('lesehan-iga-sapi-mataram','Lesehan Iga Sapi Selokan Mataram','restaurant','Riverside lesehan serving beef ribs and grilled fish.',ST_GeogFromText('SRID=4326;POINT(110.3851 -7.7659)'),-7.7659,110.3851,'yogyakarta','Jl. Selokan Mataram, Sleman',ARRAY['halal','outside_city'],'approved'),
('pasta-banget','Pasta Banget','restaurant','Casual Italian pasta restaurant near Simanjuntak campus row.',ST_GeogFromText('SRID=4326;POINT(110.3814 -7.7878)'),-7.7878,110.3814,'yogyakarta','Jl. C. Simanjuntak No.59, Yogyakarta',ARRAY['english_spoken'],'approved'),

-- ─────────────────────────────────────────────────────────────────────
-- CAFES (14)
-- ─────────────────────────────────────────────────────────────────────
('legend-coffee','Legend Coffee','cafe','Two-storey coffee shop with an extensive Indonesian menu.',ST_GeogFromText('SRID=4326;POINT(110.3686 -7.7969)'),-7.7969,110.3686,'yogyakarta','Jl. Abu Bakar Ali No.24, Yogyakarta',ARRAY['english_spoken','tourist'],'approved'),
('sruput-coffee','Sruput Coffee','cafe','Speciality-coffee shop in the south-of-Kraton creative belt.',ST_GeogFromText('SRID=4326;POINT(110.3675 -7.8157)'),-7.8157,110.3675,'yogyakarta','Jl. Tirtodipuran, Yogyakarta',ARRAY['english_spoken'],'approved'),
('roaster-and-bear','Roaster and Bear','cafe','Speciality roaster and weekend brunch destination.',ST_GeogFromText('SRID=4326;POINT(110.3854 -7.7805)'),-7.7805,110.3854,'yogyakarta','Jl. Pandega Marta, Sleman',ARRAY['english_spoken'],'approved'),
('blanco-coffee-books','Blanco Coffee & Books','cafe','Café with a library wall and rotating book exchanges.',ST_GeogFromText('SRID=4326;POINT(110.3787 -7.7831)'),-7.7831,110.3787,'yogyakarta','Jl. Soka, Yogyakarta',ARRAY['english_spoken'],'approved'),
('antologi-collaborative-space','Antologi Collaborative Space','cafe','Coworking café and event space in central Yogya.',ST_GeogFromText('SRID=4326;POINT(110.3849 -7.7783)'),-7.7783,110.3849,'yogyakarta','Jl. Suroto No.30, Yogyakarta',ARRAY['english_spoken'],'approved'),
('janji-jiwa-malioboro','Janji Jiwa Malioboro','cafe','National coffee chain branch on Malioboro.',ST_GeogFromText('SRID=4326;POINT(110.3654 -7.7926)'),-7.7926,110.3654,'yogyakarta','Jl. Malioboro, Yogyakarta',ARRAY['tourist'],'approved'),
('kopi-tuli','Kopi Tuli','cafe','Café staffed entirely by deaf baristas; sign-language menu.',ST_GeogFromText('SRID=4326;POINT(110.3893 -7.7843)'),-7.7843,110.3893,'yogyakarta','Jl. Kaliurang Km.4.5, Sleman',ARRAY['english_spoken'],'approved'),
('sebelas-coffee','Sebelas Coffee','cafe','Quiet speciality coffee shop in Kotabaru.',ST_GeogFromText('SRID=4326;POINT(110.3753 -7.7867)'),-7.7867,110.3753,'yogyakarta','Jl. Suroto No.11, Yogyakarta',ARRAY['english_spoken'],'approved'),
('wedang-kopi-prawirotaman','Wedang Kopi Prawirotaman','cafe','Traditional Javanese coffee shop in the Prawirotaman district.',ST_GeogFromText('SRID=4326;POINT(110.3651 -7.8141)'),-7.8141,110.3651,'yogyakarta','Jl. Prawirotaman, Yogyakarta',ARRAY['tourist','english_spoken'],'approved'),
('nakoa-patisserie','Nakoa Pâtisserie','cafe','French-style pastries paired with speciality coffee.',ST_GeogFromText('SRID=4326;POINT(110.3793 -7.7867)'),-7.7867,110.3793,'yogyakarta','Jl. C. Simanjuntak No.71, Yogyakarta',ARRAY['english_spoken'],'approved'),
('common-grounds-yogya','Common Grounds Yogya','cafe','Speciality coffee chain branch with brunch menu.',ST_GeogFromText('SRID=4326;POINT(110.3777 -7.7857)'),-7.7857,110.3777,'yogyakarta','Jl. Jenderal Sudirman, Yogyakarta',ARRAY['english_spoken'],'approved'),
('cermin-coffee','Cermin Coffee','cafe','Minimalist café near Kotabaru with manual brew bar.',ST_GeogFromText('SRID=4326;POINT(110.3782 -7.7847)'),-7.7847,110.3782,'yogyakarta','Jl. Faridan M. Noto, Yogyakarta',ARRAY['english_spoken'],'approved'),
('tempo-gelato','Tempo Gelato','cafe','Artisanal Italian-style gelato shop on Prawirotaman.',ST_GeogFromText('SRID=4326;POINT(110.3650 -7.8141)'),-7.8141,110.3650,'yogyakarta','Jl. Prawirotaman, Yogyakarta',ARRAY['tourist','family','english_spoken'],'approved'),
('loko-coffee-shop','Loko Coffee Shop','cafe','Café set inside a parked train carriage at Stasiun Tugu.',ST_GeogFromText('SRID=4326;POINT(110.3637 -7.7884)'),-7.7884,110.3637,'yogyakarta','Stasiun Yogyakarta (Tugu), Yogyakarta',ARRAY['tourist'],'approved'),

-- ─────────────────────────────────────────────────────────────────────
-- BARS & CLUBS (5)
-- ─────────────────────────────────────────────────────────────────────
('republic-resto-lounge','Republic Resto & Lounge','bar','Live-music lounge bar with weekly DJ residencies.',ST_GeogFromText('SRID=4326;POINT(110.3878 -7.7836)'),-7.7836,110.3878,'yogyakarta','Jl. Affandi, Sleman',ARRAY['nightlife'],'approved'),
('frequency-21','Frequency 21 Club','club','Dance club hosting EDM and hip-hop nights in north Yogya.',ST_GeogFromText('SRID=4326;POINT(110.3853 -7.7773)'),-7.7773,110.3853,'yogyakarta','Jl. Magelang Km.5.5, Yogyakarta',ARRAY['nightlife'],'approved'),
('diamond-lounge','Diamond Lounge','bar','Hotel-attached lounge bar with table service.',ST_GeogFromText('SRID=4326;POINT(110.3814 -7.7831)'),-7.7831,110.3814,'yogyakarta','Jl. Gejayan, Yogyakarta',ARRAY['nightlife'],'approved'),
('viavia-cafe-prawirotaman','ViaVia Cafe Jogja','bar','International bar-café with travel info in Prawirotaman.',ST_GeogFromText('SRID=4326;POINT(110.3653 -7.8142)'),-7.8142,110.3653,'yogyakarta','Jl. Prawirotaman No.30, Yogyakarta',ARRAY['nightlife','english_spoken','tourist'],'approved'),
('indoluxe-sky-lounge','Indoluxe Sky Lounge','bar','Rooftop bar on the Indoluxe Hotel with city views.',ST_GeogFromText('SRID=4326;POINT(110.3815 -7.7826)'),-7.7826,110.3815,'yogyakarta','Jl. Gejayan No.40, Yogyakarta',ARRAY['nightlife','english_spoken'],'approved'),

-- ─────────────────────────────────────────────────────────────────────
-- HOSPITALS (5)
-- ─────────────────────────────────────────────────────────────────────
('rs-jih','RS JIH (Jogja International Hospital)','hospital','International-tier private hospital with full specialties.',ST_GeogFromText('SRID=4326;POINT(110.4111 -7.7556)'),-7.7556,110.4111,'yogyakarta','Jl. Ring Road Utara No.160, Sleman',ARRAY['open_24h','emergency','english_spoken'],'approved'),
('rs-hermina-yogya','RS Hermina Yogya','hospital','Private hospital focused on women''s and children''s health.',ST_GeogFromText('SRID=4326;POINT(110.4179 -7.7637)'),-7.7637,110.4179,'yogyakarta','Jl. Selokan Mataram, Sleman',ARRAY['open_24h','emergency','family'],'approved'),
('rs-siloam-yogya','RS Siloam Yogyakarta','hospital','Branch of the international Siloam hospital chain.',ST_GeogFromText('SRID=4326;POINT(110.4007 -7.7872)'),-7.7872,110.4007,'yogyakarta','Jl. Laksda Adisucipto Km.6.5, Yogyakarta',ARRAY['open_24h','emergency','english_spoken'],'approved'),
('rs-mata-dr-yap','RS Mata Dr. Yap','hospital','Specialist eye hospital, long-established in the city.',ST_GeogFromText('SRID=4326;POINT(110.3672 -7.7846)'),-7.7846,110.3672,'yogyakarta','Jl. Cik Di Tiro No.5, Yogyakarta',ARRAY['emergency'],'approved'),
('rsud-wirosaban','RSUD Kota Yogyakarta (Wirosaban)','hospital','City-run public general hospital with emergency services.',ST_GeogFromText('SRID=4326;POINT(110.3793 -7.8197)'),-7.8197,110.3793,'yogyakarta','Jl. Wirosaban No.1, Yogyakarta',ARRAY['open_24h','emergency'],'approved'),

-- ─────────────────────────────────────────────────────────────────────
-- DOCTORS & CLINICS (3)
-- ─────────────────────────────────────────────────────────────────────
('klinik-pratama-sehat','Klinik Pratama Sehat','doctor','Primary-care GP clinic accepting BPJS health insurance.',ST_GeogFromText('SRID=4326;POINT(110.3811 -7.7942)'),-7.7942,110.3811,'yogyakarta','Jl. Jenderal Sudirman, Yogyakarta',ARRAY[]::text[],'approved'),
('klinik-medika-plaza','Klinik Medika Plaza','doctor','Mid-size general clinic with multiple specialists.',ST_GeogFromText('SRID=4326;POINT(110.3782 -7.7873)'),-7.7873,110.3782,'yogyakarta','Jl. C. Simanjuntak, Yogyakarta',ARRAY[]::text[],'approved'),
('klinik-asri-medical','Klinik Asri Medical Center','doctor','Multi-specialty outpatient clinic in central Yogyakarta.',ST_GeogFromText('SRID=4326;POINT(110.3691 -7.8094)'),-7.8094,110.3691,'yogyakarta','Jl. HOS Cokroaminoto, Yogyakarta',ARRAY[]::text[],'approved'),

-- ─────────────────────────────────────────────────────────────────────
-- DENTISTS (3)
-- ─────────────────────────────────────────────────────────────────────
('klinik-gigi-dentalku','Klinik Gigi DentalKu','dentist','Modern dental practice with implant services.',ST_GeogFromText('SRID=4326;POINT(110.3819 -7.7821)'),-7.7821,110.3819,'yogyakarta','Jl. Gejayan No.39, Yogyakarta',ARRAY[]::text[],'approved'),
('klinik-gigi-sahabat','Klinik Gigi Sahabat','dentist','Family-friendly dental clinic in central Yogyakarta.',ST_GeogFromText('SRID=4326;POINT(110.3737 -7.7980)'),-7.7980,110.3737,'yogyakarta','Jl. KH Wahid Hasyim, Yogyakarta',ARRAY['family'],'approved'),
('jih-dental-clinic','JIH Dental Clinic','dentist','Dental department of RS JIH with specialist orthodontics.',ST_GeogFromText('SRID=4326;POINT(110.4111 -7.7556)'),-7.7556,110.4111,'yogyakarta','Jl. Ring Road Utara No.160, Sleman',ARRAY['english_spoken'],'approved'),

-- ─────────────────────────────────────────────────────────────────────
-- PHARMACIES (6)
-- ─────────────────────────────────────────────────────────────────────
('apotek-kimia-farma-sudirman','Apotek Kimia Farma Sudirman','pharmacy','State pharmacy chain branch on Jl. Sudirman.',ST_GeogFromText('SRID=4326;POINT(110.3712 -7.7833)'),-7.7833,110.3712,'yogyakarta','Jl. Jenderal Sudirman, Yogyakarta',ARRAY[]::text[],'approved'),
('apotek-k24-gejayan','Apotek K-24 Gejayan','pharmacy','24-hour pharmacy chain branch with prescription delivery.',ST_GeogFromText('SRID=4326;POINT(110.3863 -7.7790)'),-7.7790,110.3863,'yogyakarta','Jl. Affandi (Gejayan), Yogyakarta',ARRAY['open_24h'],'approved'),
('apotek-century-hartono','Apotek Century Hartono Mall','pharmacy','Health and beauty pharmacy located inside Hartono Mall.',ST_GeogFromText('SRID=4326;POINT(110.3829 -7.7553)'),-7.7553,110.3829,'yogyakarta','Hartono Mall, Sleman',ARRAY[]::text[],'approved'),
('apotek-watsons-ambarrukmo','Apotek Watsons Plaza Ambarrukmo','pharmacy','Watsons pharmacy and personal-care store at Plaza Ambarrukmo.',ST_GeogFromText('SRID=4326;POINT(110.4014 -7.7818)'),-7.7818,110.4014,'yogyakarta','Plaza Ambarrukmo, Yogyakarta',ARRAY[]::text[],'approved'),
('apotek-kimia-farma-gejayan','Apotek Kimia Farma Gejayan','pharmacy','State pharmacy chain branch on Jl. Affandi.',ST_GeogFromText('SRID=4326;POINT(110.3879 -7.7783)'),-7.7783,110.3879,'yogyakarta','Jl. Affandi (Gejayan), Yogyakarta',ARRAY[]::text[],'approved'),
('apotek-sehat-bersama','Apotek Sehat Bersama','pharmacy','Independent neighbourhood pharmacy in central Yogyakarta.',ST_GeogFromText('SRID=4326;POINT(110.3593 -7.7975)'),-7.7975,110.3593,'yogyakarta','Jl. KH Ahmad Dahlan, Yogyakarta',ARRAY[]::text[],'approved'),

-- ─────────────────────────────────────────────────────────────────────
-- MALLS (5)
-- ─────────────────────────────────────────────────────────────────────
('lippo-plaza-jogja','Lippo Plaza Jogja','mall','Mid-size mall with cinema and food court east of the centre.',ST_GeogFromText('SRID=4326;POINT(110.3877 -7.7787)'),-7.7787,110.3877,'yogyakarta','Jl. Laksda Adisucipto, Yogyakarta',ARRAY['family'],'approved'),
('sleman-city-hall','Sleman City Hall','mall','North-Yogya mall and entertainment hub with cinema.',ST_GeogFromText('SRID=4326;POINT(110.4180 -7.7250)'),-7.7250,110.4180,'yogyakarta','Jl. Magelang Km.9.2, Sleman',ARRAY['family','outside_city'],'approved'),
('ramai-mall','Ramai Mall','mall','Long-running Malioboro-area mall with budget fashion.',ST_GeogFromText('SRID=4326;POINT(110.3654 -7.7944)'),-7.7944,110.3654,'yogyakarta','Jl. Malioboro, Yogyakarta',ARRAY['tourist','family'],'approved'),
('gardena-department-store','Gardena Department Store','mall','Local department store chain on Urip Sumoharjo.',ST_GeogFromText('SRID=4326;POINT(110.3735 -7.7820)'),-7.7820,110.3735,'yogyakarta','Jl. URIP Sumoharjo, Yogyakarta',ARRAY['family'],'approved'),
('plaza-saphir','Plaza Saphir','mall','Mall with electronics, fashion and a hypermarket anchor.',ST_GeogFromText('SRID=4326;POINT(110.3835 -7.7888)'),-7.7888,110.3835,'yogyakarta','Jl. Solo No.456, Yogyakarta',ARRAY['family'],'approved'),

-- ─────────────────────────────────────────────────────────────────────
-- HOTELS (15)
-- ─────────────────────────────────────────────────────────────────────
('marriott-yogyakarta','Yogyakarta Marriott Hotel','hotel','Five-star international hotel on the northern Ring Road.',ST_GeogFromText('SRID=4326;POINT(110.3899 -7.7787)'),-7.7787,110.3899,'yogyakarta','Jl. Ring Road Utara No.198, Yogyakarta',ARRAY['english_spoken','tourist'],'approved'),
('sheraton-mustika','Sheraton Mustika Yogyakarta Resort & Spa','hotel','Resort-style hotel with spa near the airport.',ST_GeogFromText('SRID=4326;POINT(110.4045 -7.7896)'),-7.7896,110.4045,'yogyakarta','Jl. Laksda Adisucipto Km.8.7, Yogyakarta',ARRAY['english_spoken','tourist'],'approved'),
('melia-purosani','Melia Purosani Yogyakarta','hotel','International chain hotel a few blocks from Malioboro.',ST_GeogFromText('SRID=4326;POINT(110.3711 -7.7986)'),-7.7986,110.3711,'yogyakarta','Jl. Suryotomo No.31, Yogyakarta',ARRAY['english_spoken','tourist'],'approved'),
('grand-inna-malioboro','Grand Inna Malioboro','hotel','Heritage hotel directly on Malioboro Street.',ST_GeogFromText('SRID=4326;POINT(110.3658 -7.7937)'),-7.7937,110.3658,'yogyakarta','Jl. Malioboro No.60, Yogyakarta',ARRAY['english_spoken','tourist'],'approved'),
('ibis-styles-yogyakarta','ibis Styles Yogyakarta','hotel','Budget-friendly chain hotel one block from Malioboro.',ST_GeogFromText('SRID=4326;POINT(110.3656 -7.7942)'),-7.7942,110.3656,'yogyakarta','Jl. Dagen No.109, Yogyakarta',ARRAY['english_spoken','tourist','family'],'approved'),
('westlake-resort','The Westlake Resort','hotel','Lakeside resort with bungalow accommodation north of the city.',ST_GeogFromText('SRID=4326;POINT(110.3552 -7.7269)'),-7.7269,110.3552,'yogyakarta','Jl. Ring Road Barat, Sleman',ARRAY['family','outside_city'],'approved'),
('hotel-tugu-yogyakarta','Hotel Tugu Yogyakarta','hotel','Boutique heritage hotel with an extensive Indonesian art collection.',ST_GeogFromText('SRID=4326;POINT(110.3666 -7.7831)'),-7.7831,110.3666,'yogyakarta','Jl. Margo Utomo, Yogyakarta',ARRAY['english_spoken','tourist'],'approved'),
('plataran-heritage-yogyakarta','Plataran Heritage Yogyakarta','hotel','Boutique heritage property in the Borobudur cultural area.',ST_GeogFromText('SRID=4326;POINT(110.2118 -7.6065)'),-7.6065,110.2118,'yogyakarta','Karangrejo, Borobudur, Magelang',ARRAY['english_spoken','tourist','outside_city'],'approved'),
('adhisthana-hotel','Adhisthana Hotel','hotel','Mid-range boutique hotel with pool in Prawirotaman.',ST_GeogFromText('SRID=4326;POINT(110.3651 -7.8141)'),-7.8141,110.3651,'yogyakarta','Jl. Prawirotaman II No.613, Yogyakarta',ARRAY['english_spoken','tourist'],'approved'),
('cavinton-hotel','Cavinton Hotel Yogyakarta','hotel','Four-star city-centre hotel with conference facilities.',ST_GeogFromText('SRID=4326;POINT(110.3658 -7.8013)'),-7.8013,110.3658,'yogyakarta','Jl. Letjen Suprapto No.1, Yogyakarta',ARRAY['english_spoken','tourist'],'approved'),
('eastparc-hotel','Eastparc Hotel Yogyakarta','hotel','Family-oriented hotel with lake view in eastern Yogyakarta.',ST_GeogFromText('SRID=4326;POINT(110.4072 -7.7551)'),-7.7551,110.4072,'yogyakarta','Jl. Laksda Adisucipto Km.6.5, Sleman',ARRAY['english_spoken','family'],'approved'),
('the-alana-yogyakarta','The Alana Yogyakarta','hotel','Convention hotel with large meeting facilities in Sleman.',ST_GeogFromText('SRID=4326;POINT(110.3892 -7.7790)'),-7.7790,110.3892,'yogyakarta','Jl. Palagan Tentara Pelajar, Sleman',ARRAY['english_spoken'],'approved'),
('grand-mercure-adi-sucipto','Grand Mercure Yogyakarta Adi Sucipto','hotel','Four-star hotel close to Adisutjipto Airport.',ST_GeogFromText('SRID=4326;POINT(110.4135 -7.7855)'),-7.7855,110.4135,'yogyakarta','Jl. Laksda Adisucipto, Yogyakarta',ARRAY['english_spoken','tourist'],'approved'),
('aston-inn-tugu','Aston Inn Tugu Yogyakarta','hotel','Three-star chain hotel near Tugu Monument.',ST_GeogFromText('SRID=4326;POINT(110.3661 -7.7822)'),-7.7822,110.3661,'yogyakarta','Jl. Pangeran Mangkubumi No.57, Yogyakarta',ARRAY['english_spoken','tourist'],'approved'),
('indoluxe-hotel-jogja','Indoluxe Hotel Jogja','hotel','Boutique hotel with rooftop bar near Gejayan.',ST_GeogFromText('SRID=4326;POINT(110.3815 -7.7826)'),-7.7826,110.3815,'yogyakarta','Jl. Gejayan No.40, Yogyakarta',ARRAY['english_spoken'],'approved'),

-- ─────────────────────────────────────────────────────────────────────
-- TRANSIT (2)
-- ─────────────────────────────────────────────────────────────────────
('terminal-condongcatur','Sub-Terminal Condongcatur','bus_station','Sleman sub-terminal serving suburban and inter-city routes.',ST_GeogFromText('SRID=4326;POINT(110.4001 -7.7560)'),-7.7560,110.4001,'yogyakarta','Jl. Anggajaya, Condongcatur, Depok, Sleman',ARRAY['transit'],'approved'),
('stasiun-maguwo','Stasiun Maguwo','train_station','Commuter rail station integrated with Adisutjipto Airport.',ST_GeogFromText('SRID=4326;POINT(110.4334 -7.7873)'),-7.7873,110.4334,'yogyakarta','Maguwoharjo, Depok, Sleman',ARRAY['transit','outside_city'],'approved'),

-- ─────────────────────────────────────────────────────────────────────
-- GOVERNMENT (3)
-- ─────────────────────────────────────────────────────────────────────
('kantor-imigrasi-yogya','Kantor Imigrasi Yogyakarta','government','Immigration office for passport and visa services.',ST_GeogFromText('SRID=4326;POINT(110.3974 -7.7901)'),-7.7901,110.3974,'yogyakarta','Jl. Solo Km.10, Yogyakarta',ARRAY[]::text[],'approved'),
('kantor-pos-besar-yogya','Kantor Pos Besar Yogyakarta','government','Main post office at Titik Nol Kilometer.',ST_GeogFromText('SRID=4326;POINT(110.3651 -7.8014)'),-7.8014,110.3651,'yogyakarta','Jl. Senopati No.2, Yogyakarta',ARRAY['tourist'],'approved'),
('kantor-dukcapil-yogya','Dinas Dukcapil Kota Yogyakarta','government','Civil registration office for ID cards and family records.',ST_GeogFromText('SRID=4326;POINT(110.3754 -7.8033)'),-7.8033,110.3754,'yogyakarta','Jl. Kenari No.56, Yogyakarta',ARRAY[]::text[],'approved'),

-- ─────────────────────────────────────────────────────────────────────
-- BIKE REPAIR (5)
-- ─────────────────────────────────────────────────────────────────────
('suzuki-service-sudirman','Suzuki Service Center Sudirman','bike_repair','Authorised Suzuki motorcycle service centre.',ST_GeogFromText('SRID=4326;POINT(110.3815 -7.7843)'),-7.7843,110.3815,'yogyakarta','Jl. Jenderal Sudirman, Yogyakarta',ARRAY[]::text[],'approved'),
('bengkel-variasi-jogja','Bengkel Variasi Jogja','bike_repair','Motorcycle modification, accessories and tuning shop.',ST_GeogFromText('SRID=4326;POINT(110.3859 -7.7806)'),-7.7806,110.3859,'yogyakarta','Jl. Affandi (Gejayan), Yogyakarta',ARRAY[]::text[],'approved'),
('ahass-mlati','Honda AHASS Mlati','bike_repair','Authorised Honda service centre in Mlati, north Sleman.',ST_GeogFromText('SRID=4326;POINT(110.3534 -7.7588)'),-7.7588,110.3534,'yogyakarta','Jl. Magelang Km.7, Mlati, Sleman',ARRAY[]::text[],'approved'),
('yamaha-sumber-baru','Yamaha Sumber Baru','bike_repair','Authorised Yamaha dealer and service centre.',ST_GeogFromText('SRID=4326;POINT(110.3739 -7.7858)'),-7.7858,110.3739,'yogyakarta','Jl. Jenderal Sudirman, Yogyakarta',ARRAY[]::text[],'approved'),
('bengkel-motor-bambang','Bengkel Motor Bambang','bike_repair','Independent neighbourhood workshop, all motorcycle brands.',ST_GeogFromText('SRID=4326;POINT(110.3789 -7.8023)'),-7.8023,110.3789,'yogyakarta','Jl. Veteran, Yogyakarta',ARRAY[]::text[],'approved');

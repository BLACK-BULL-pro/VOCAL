/* Contenido de V.O.C.A.L. — edita aquí para agregar niveles, temas, preguntas y vocabulario. */
const VOCAL_DATA = {
  levels: {
    A1: 'Principiante', A2: 'Básico', B1: 'Intermedio',
    B2: 'Intermedio alto', C1: 'Avanzado', C2: 'Maestría'
  },
  lessons: [
    { id:'present-simple', type:'grammar', level:'A1', title:'Presente simple', duration:6, description:'Habla de rutinas, hábitos y hechos cotidianos.', lesson:'Usa el presente simple para acciones habituales. Con he, she e it agrega -s o -es al verbo. En preguntas utiliza do o does; después de does, el verbo vuelve a su forma base.', examples:['I study English every day. — Estudio inglés todos los días.','She works at a hospital. — Ella trabaja en un hospital.','Does he play tennis? — ¿Él juega tenis?'], quiz:[{q:'My brother ___ coffee every morning.',options:['drink','drinks','drinking'],answer:1,explanation:'My brother equivale a he; en afirmativo el verbo lleva -s.'},{q:'___ they live near here?',options:['Do','Does','Are'],answer:0,explanation:'Con they usamos do para formar preguntas en presente simple.'},{q:'She ___ watch TV before school.',options:['don’t','doesn’t','isn’t'],answer:1,explanation:'La negación con she se forma con doesn’t + verbo base.'}] },
    { id:'past-simple', type:'grammar', level:'A2', title:'Pasado simple', duration:7, description:'Cuenta experiencias y acciones que ya terminaron.', lesson:'Para verbos regulares, agrega -ed (work → worked). Muchos verbos comunes son irregulares (go → went). En preguntas y negaciones usa did y el verbo en forma base.', examples:['We visited Bogotá last year. — Visitamos Bogotá el año pasado.','He went home early. — Él se fue a casa temprano.','Did you see the movie? — ¿Viste la película?'], quiz:[{q:'Yesterday, Ana ___ a new book.',options:['buy','bought','buys'],answer:1,explanation:'Buy es irregular; su forma en pasado es bought.'},{q:'They ___ football last weekend.',options:['played','play','plays'],answer:0,explanation:'La acción terminó el fin de semana pasado; usamos played.'},{q:'___ you call your friend?',options:['Did','Do','Were'],answer:0,explanation:'Las preguntas en pasado simple comienzan con did y usan el verbo base.'}] },
    { id:'present-perfect', type:'grammar', level:'B1', title:'Presente perfecto', duration:8, description:'Conecta experiencias pasadas con el presente.', lesson:'Forma el presente perfecto con have/has + participio. Úsalo para experiencias sin una fecha específica, cambios o acciones que continúan. Con un momento pasado terminado, normalmente usa pasado simple.', examples:['I have visited Peru twice. — He visitado Perú dos veces.','She has lived here since 2022. — Ella vive aquí desde 2022.','Have you ever tried sushi? — ¿Alguna vez has probado sushi?'], quiz:[{q:'We ___ never ___ that museum.',options:['have / visited','has / visit','did / visited'],answer:0,explanation:'Con we usamos have + participio: visited.'},{q:'Luis ___ worked here for three years.',options:['have','has','is'],answer:1,explanation:'Con he/she/it usamos has + participio.'},{q:'I ___ him yesterday.',options:['have seen','saw','has seen'],answer:1,explanation:'Yesterday indica un momento terminado; corresponde el pasado simple saw.'}] },
    { id:'false-friends', type:'vocabulary', level:'A2', title:'Falsos amigos frecuentes', duration:6, description:'Evita confundir palabras parecidas en inglés y español.', lesson:'Algunas palabras se parecen al español pero significan algo distinto. Actually significa “en realidad”; embarrassed significa “avergonzado”; y attend significa “asistir”. Aprende cada palabra en una frase.', examples:['Actually, I prefer tea. — En realidad, prefiero el té.','I felt embarrassed. — Me sentí avergonzado.','She attends English class. — Ella asiste a clase de inglés.'], quiz:[{q:'“Actually” significa…',options:['Actualmente','En realidad','Actuar'],answer:1,explanation:'Actually quiere decir “en realidad” o “de hecho”.'},{q:'Si estás “embarrassed”, estás…',options:['Avergonzado','Embarazada','Aburrido'],answer:0,explanation:'Embarrassed significa avergonzado; “embarazada” es pregnant.'},{q:'“I attend university” quiere decir…',options:['Atiendo la universidad','Asisto a la universidad','Espero a la universidad'],answer:1,explanation:'Attend significa asistir a un lugar o evento.'}] },
    { id:'phrasal-verbs', type:'vocabulary', level:'B1', title:'Phrasal verbs cotidianos', duration:7, description:'Comprende verbos compuestos comunes en conversaciones.', lesson:'Un phrasal verb combina un verbo con una partícula y adquiere un significado propio. Learn about significa aprender sobre; find out significa averiguar; y give up significa rendirse o dejar algo.', examples:['I want to learn about Colombian history. — Quiero aprender sobre la historia de Colombia.','We found out the answer. — Averiguamos la respuesta.','Don’t give up! — ¡No te rindas!'], quiz:[{q:'“Find out” significa…',options:['Encontrar afuera','Averiguar o descubrir','Salir'],answer:1,explanation:'Find out se usa para averiguar o descubrir información.'},{q:'“Please turn off the lights” significa…',options:['Enciende las luces','Apaga las luces','Cambia las luces'],answer:1,explanation:'Turn off significa apagar un aparato o una luz.'},{q:'“Give up” significa…',options:['Regalar','Rendirse o dejar de intentar','Recoger'],answer:1,explanation:'Give up significa rendirse o abandonar un hábito/actividad.'}] },
    { id:'travel-words', type:'vocabulary', level:'A2', title:'Vocabulario para viajar', duration:6, description:'Palabras útiles para moverte y resolver situaciones de viaje.', lesson:'Aprende estas palabras en contexto: boarding pass (pase de abordar), luggage (equipaje), gate (puerta de embarque) y reservation (reserva). Practica usándolas en frases completas.', examples:['Where is gate 12? — ¿Dónde está la puerta 12?','I have one piece of luggage. — Tengo una pieza de equipaje.','I have a hotel reservation. — Tengo una reserva de hotel.'], quiz:[{q:'¿Qué necesitas mostrar para abordar un avión?',options:['A boarding pass','A recipe','A receipt'],answer:0,explanation:'El boarding pass es el pase de abordar.'},{q:'“Luggage” significa…',options:['Pasajeros','Equipaje','Paisaje'],answer:1,explanation:'Luggage es el equipaje que llevas en un viaje.'},{q:'Una “reservation” en un hotel es…',options:['Una reserva','Una habitación','Una recomendación'],answer:0,explanation:'Reservation significa reserva.'}] }
  ],
  topics: []
};

function createLevelTopics() {
  const interactionByLevel = {
    A1: 'Speaker A answers in two short sentences and gives one example, then asks Speaker B: “What about you?” Speaker B answers and asks one simple follow-up.',
    A2: 'Speaker A gives two details and a personal example, then asks Speaker B to compare. Speaker B shares a different example and asks a follow-up.',
    B1: 'Speaker A explains their answer with two reasons or examples, then asks Speaker B how their experience is different. Speaker B responds and asks a related follow-up.',
    B2: 'Speaker A supports an opinion with evidence and an example, then invites Speaker B to challenge one point. Speaker B responds with a counterexample and asks a follow-up.',
    C1: 'Speaker A states a position, supports it with evidence, and notes one limitation. Speaker B offers another interpretation, asks a probing question, and responds to A’s follow-up.',
    C2: 'Speaker A develops a nuanced argument with evidence and a counterargument. Speaker B challenges an assumption, offers an alternative interpretation, and asks A to defend the conclusion.'
  };
  const followUpsFor = (subtopic, level) => {
    const subject = `“${subtopic.name}”`;
    const questions = {
      A1: [
        `What do you like most about ${subject}?`,
        `When or where do you usually experience ${subject}?`,
        `Who do you share ${subject} with?`,
        `What is one example of ${subject} from your life?`,
        `What would you like to try or learn next about ${subject}?`
      ],
      A2: [
        `Can you describe a recent example of ${subject}?`,
        `What do you enjoy or find difficult about ${subject}?`,
        `How does your experience of ${subject} compare with your partner’s?`,
        `What usually happens before or after ${subject}?`,
        `What would you recommend to someone interested in ${subject}?`
      ],
      B1: [
        `Which experience has shaped your opinion about ${subject}?`,
        `What is one benefit and one challenge related to ${subject}?`,
        `How does ${subject} affect people in your community?`,
        `Can you compare your experience of ${subject} with your partner’s?`,
        `What change would improve ${subject}, and why?`
      ],
      B2: [
        `What causes or factors have the greatest influence on ${subject}?`,
        `How do different perspectives on ${subject} compare?`,
        `What evidence supports your view of ${subject}?`,
        `What unintended consequence could result from changing ${subject}?`,
        `Which action should people prioritize in relation to ${subject}, and why?`
      ],
      C1: [
        `Which assumptions shape common discussions of ${subject}?`,
        `What evidence or case best supports your interpretation of ${subject}?`,
        `How has the meaning or practice of ${subject} changed across groups or time?`,
        `Which trade-off or unintended effect is often overlooked in ${subject}?`,
        `What is the strongest competing argument about ${subject}, and where are its limits?`
      ],
      C2: [
        `What historical or conceptual context is essential to analyzing ${subject}?`,
        `Which competing interpretations of ${subject} deserve serious consideration?`,
        `How reliable is the evidence used to explain ${subject}?`,
        `What long-term consequences could follow from decisions about ${subject}?`,
        `How would you defend your position on ${subject} against its strongest counterargument?`
      ]
    };
    return questions[level] || questions.B1;
  };
  const topicVocabulary = {
    'a1-routines': [['wake up','despertarse','get up'],['breakfast','desayuno','morning meal'],['get dressed','vestirse','put on clothes']],
    'a1-people': [['relative','familiar','family member'],['friendly','amable','kind'],['share','compartir','give']],
    'a1-food': [['meal','comida','dish'],['tasty','sabroso','delicious'],['order','pedir','request']],
    'a1-places': [['nearby','cercano','close'],['square','plaza','plaza'],['turn left','girar a la izquierda','go left']],
    'a2-simple-present': [['routine','rutina','habit'],['usually','normalmente','generally'],['weekday','día entre semana','workday']],
    'a2-hobbies': [['hobby','pasatiempo','pastime'],['practice','practicar','train'],['enjoy','disfrutar','like']],
    'a2-food-lifestyle': [['ingredient','ingrediente','component'],['healthy','saludable','good for you'],['recipe','receta','instructions']],
    'a2-travel': [['luggage','equipaje','baggage'],['sightseeing','hacer turismo','visiting attractions'],['booking','reserva','reservation']],
    'b1-education': [['assignment','tarea','schoolwork'],['study habits','hábitos de estudio','study routine'],['deadline','fecha límite','due date']],
    'b1-career': [['career goal','meta profesional','professional aim'],['skill','habilidad','ability'],['application','solicitud de empleo','job application']],
    'b1-culture-travel': [['local custom','costumbre local','tradition'],['destination','destino','place to visit'],['memorable','inolvidable','unforgettable']],
    'b1-health': [['well-being','bienestar','health'],['balanced diet','dieta equilibrada','healthy diet'],['stress','estrés','pressure']],
    'b2-media': [['headline','titular','news title'],['reliable source','fuente confiable','trustworthy source'],['bias','sesgo','prejudice']],
    'b2-environment': [['renewable energy','energía renovable','clean energy'],['waste','residuos','rubbish'],['conservation','conservación','protection']],
    'b2-workplace': [['collaboration','colaboración','teamwork'],['workload','carga laboral','amount of work'],['flexible schedule','horario flexible','adjustable hours']],
    'b2-culture': [['heritage','patrimonio','legacy'],['representation','representación','portrayal'],['perspective','perspectiva','point of view']],
    'c1-tech-ethics': [['privacy','privacidad','confidentiality'],['accountability','responsabilidad','answerability'],['algorithm','algoritmo','computational procedure']],
    'c1-global': [['inequality','desigualdad','imbalance'],['trade-off','compensación','compromise'],['policy','política pública','strategy']],
    'c1-education': [['critical thinking','pensamiento crítico','analytical reasoning'],['curriculum','plan de estudios','syllabus'],['assessment','evaluación','evaluation']],
    'c1-culture-media': [['narrative','relato','account'],['representation','representación','portrayal'],['interpretation','interpretación','understanding']],
    'c2-history': [['historical context','contexto histórico','background'],['primary source','fuente primaria','original record'],['aftermath','repercusiones','consequences']],
    'c2-relations': [['diplomacy','diplomacia','negotiation'],['alliance','alianza','partnership'],['sovereignty','soberanía','independence']],
    'c2-philosophy': [['moral framework','marco moral','ethical system'],['premise','premisa','assumption'],['counterargument','contraargumento','opposing argument']],
    'c2-science': [['hypothesis','hipótesis','proposition'],['peer review','revisión por pares','expert evaluation'],['uncertainty','incertidumbre','unpredictability']]
  };
  const makeSubtopic = (name, prompt, focusQuestion, roles = null) => ({ name, prompt, focusQuestion, ...(roles ? { roles } : {}) });
  const makeTopic = (level, id, icon, name, roomName, subtopics) => ({
    id, icon, name, roomName, levels: [level], level,
    phases: { warmUp: [0, 1, 2], deepDive: [3, 4, 5] },
    vocab: topicVocabulary[id].map(([word, translation, synonyms]) => ({
      word, translation, synonyms,
      example: `We can use “${word.toLowerCase()}” when we talk about ${roomName.toLowerCase()}.`
    })),
    subtopics: subtopics.map((subtopic) => ({
      ...subtopic,
      questions: [subtopic.focusQuestion, ...followUpsFor(subtopic, level)].map((text) => ({
        text,
        interaction: subtopic.roles
          ? 'The Interviewer asks the question. The Candidate answers with two specific examples, then asks the Interviewer about the role. The Interviewer responds and asks one follow-up.'
          : interactionByLevel[level],
        ...(subtopic.roles ? { roles: subtopic.roles } : {})
      }))
    }))
  });
  const interviewRoles = { a: 'Interviewer', b: 'Candidate' };
  return [
    // A1 · Familiar, concrete everyday English
    makeTopic('A1','a1-routines','⏰','Rutinas diarias','Daily routines',[
      makeSubtopic('Morning routines','Talk about when you wake up and what you do before starting your day.','What time do you wake up, and what do you do first in the morning?'),
      makeSubtopic('School or work day','Describe a simple weekday from the morning until you get home.','What do you usually do on a school or work day?'),
      makeSubtopic('Evening habits','Share the activities you do after school or work and before bed.','What do you do after school or work in the evening?')
    ]),
    makeTopic('A1','a1-people','👪','Personas y familia','People and family',[
      makeSubtopic('Introducing yourself','Share your name, where you live, and a few simple facts about yourself.','How do you introduce yourself to a new person?'),
      makeSubtopic('Family members','Talk about the people in your family and what you do together.','Who is in your family, and what do you like doing together?'),
      makeSubtopic('Your home','Describe the rooms in your home and your favorite place there.','What is your home like, and which room do you like most?')
    ]),
    makeTopic('A1','a1-food','🍎','Comida y bebidas','Food and drinks',[
      makeSubtopic('Breakfast','Talk about what you eat and drink in the morning.','What do you usually eat and drink for breakfast?'),
      makeSubtopic('Favorite food','Describe a food you enjoy and when you usually eat it.','What is your favorite food, and when do you eat it?'),
      makeSubtopic('At a café','Practice ordering a drink or snack and saying what you like.','What would you like to order at a café?')
    ]),
    makeTopic('A1','a1-places','📍','Lugares conocidos','Places around town',[
      makeSubtopic('Places near home','Name familiar places and say what you do there.','What places are near your home, and which one do you visit often?'),
      makeSubtopic('Getting to school or work','Describe your usual route using simple directions.','How do you get to school or work?'),
      makeSubtopic('Asking for directions','Practice asking where a familiar place is and understanding a short answer.','How do you ask someone where a place is?')
    ]),

    // A2 · Daily life, simple present, and familiar experiences
    makeTopic('A2','a2-simple-present','🔁','Presente simple: rutinas y hábitos','Simple present: routines and habits',[
      makeSubtopic('Weekday routines','Describe your schedule and how often you do everyday activities.','What does a typical weekday look like for you?'),
      makeSubtopic('Weekend habits','Compare your regular weekend activities with your weekday routine.','What do you usually do on weekends that you do not do on weekdays?'),
      makeSubtopic('Healthy habits','Talk about regular habits that help you feel well.','Which healthy habits do you follow regularly, and how do they help you?')
    ]),
    makeTopic('A2','a2-hobbies','🎨','Tiempo libre y pasatiempos','Free time and hobbies',[
      makeSubtopic('Sports and exercise','Describe sports or exercise you do and how often you do them.','What sport or exercise do you enjoy, and how often do you do it?'),
      makeSubtopic('Music, books, and films','Share the music, books, or films you choose in your free time.','What kind of music, books, or films do you enjoy most?'),
      makeSubtopic('Weekend activities','Talk about how you spend free time with friends or family.','How do you usually spend your free time on the weekend?')
    ]),
    makeTopic('A2','a2-food-lifestyle','🥗','Alimentación y estilo de vida','Food and lifestyle',[
      makeSubtopic('Cooking at home','Describe a meal you know how to make and the steps involved.','What meal can you cook, and how do you make it?'),
      makeSubtopic('Eating out','Talk about a restaurant or café you enjoy and what you order there.','Where do you like eating out, and what do you usually order?'),
      makeSubtopic('Everyday food choices','Compare foods you eat often and foods you are trying to eat more or less.','What food do you eat often, and what would you like to change?')
    ]),
    makeTopic('A2','a2-travel','🧳','Viajes y vacaciones','Travel and holidays',[
      makeSubtopic('Getting around','Compare familiar ways to travel around a city or town.','How do you usually travel around your city, and why?'),
      makeSubtopic('Places to stay','Describe a hotel or place to stay that would suit your next trip.','What kind of place do you like staying in when you travel?'),
      makeSubtopic('Sightseeing','Talk about attractions you have visited or would like to see.','What place would you like to visit on your next holiday?')
    ]),

    // B1 · Experiences, explanations, and opinions
    makeTopic('B1','b1-education','🎓','Educación y tecnología','Education and technology',[
      makeSubtopic('Online or in-person classes','Compare what helps students learn in each format.','Which helps you learn better: online classes or in-person classes? Why?'),
      makeSubtopic('Study habits','Explain how you prepare for a class, assignment, or exam.','What study habits help you understand and remember new information?'),
      makeSubtopic('Group projects','Talk about sharing tasks and solving problems with classmates.','What makes a group project successful, and what can make it difficult?')
    ]),
    makeTopic('B1','b1-career','💼','Trabajo y desarrollo profesional','Work and career growth',[
      makeSubtopic('Job interviews','Practice describing your strengths and experience in an interview.','How would you describe a strength that makes you a good candidate?', interviewRoles),
      makeSubtopic('Teamwork','Explain how people can work together and handle disagreements.','What have you learned from working as part of a team?'),
      makeSubtopic('Career goals','Describe a professional goal and the steps needed to reach it.','What career goal would you like to achieve in the next few years?')
    ]),
    makeTopic('B1','b1-culture-travel','🌍','Viajes y culturas','Travel and cultures',[
      makeSubtopic('A memorable trip','Tell the story of a trip and explain why you remember it.','What trip has taught you something about another place or culture?'),
      makeSubtopic('Local customs','Compare a custom you know with one from another culture.','Which local custom would you like visitors to understand?'),
      makeSubtopic('A place you recommend','Describe a destination and explain what a visitor can do there.','Which place would you recommend to a visitor, and what should they do there?')
    ]),
    makeTopic('B1','b1-health','🧘','Salud y bienestar','Health and well-being',[
      makeSubtopic('Everyday routines','Explain which daily routines help you stay healthy.','What daily habits help you feel healthy and energetic?'),
      makeSubtopic('Managing stress','Describe situations that cause stress and ways people can manage it.','What do you do when you feel stressed, and why does it help?'),
      makeSubtopic('Work-life balance','Talk about balancing responsibilities with rest and free time.','How can people balance work or study with their personal lives?')
    ]),

    // B2 · Complex issues and supported viewpoints
    makeTopic('B2','b2-media','📰','Medios y opinión pública','Media and public opinion',[
      makeSubtopic('Trustworthy news','Discuss how people can judge whether a news source is reliable.','How can people decide whether a news story is trustworthy?'),
      makeSubtopic('Social media','Explore how social platforms shape relationships and public discussion.','How does social media influence the way people communicate and form opinions?'),
      makeSubtopic('Advertising','Analyze how advertising affects choices and expectations.','When does advertising inform people, and when does it manipulate them?')
    ]),
    makeTopic('B2','b2-environment','🌱','Medioambiente y ciudades','Environment and cities',[
      makeSubtopic('Urban transport','Compare ways cities can make transportation cleaner and more accessible.','What changes would make transport in large cities more sustainable?'),
      makeSubtopic('Climate action','Discuss practical responsibilities for addressing climate change.','Which climate actions should governments, companies, and individuals prioritize?'),
      makeSubtopic('Green spaces','Consider how parks and natural areas affect city life.','How do green spaces improve life in a city, and who should maintain them?')
    ]),
    makeTopic('B2','b2-workplace','🏢','El trabajo moderno','The modern workplace',[
      makeSubtopic('Remote and hybrid work','Compare working remotely with working in a shared workplace.','How does remote work change productivity and collaboration?'),
      makeSubtopic('AI at work','Consider how automation may change jobs and professional skills.','Which tasks should be automated, and which should remain human responsibilities?'),
      makeSubtopic('Leadership','Explore the qualities and decisions that help teams succeed.','What makes a leader effective when a team faces uncertainty?')
    ]),
    makeTopic('B2','b2-culture','🎭','Cultura e identidad','Culture and identity',[
      makeSubtopic('Cultural traditions','Discuss how traditions adapt as societies change.','How can communities preserve traditions while allowing them to evolve?'),
      makeSubtopic('Language and identity','Explore how language shapes belonging and personal identity.','How does speaking more than one language affect a person’s identity?'),
      makeSubtopic('Globalization','Consider how global connections influence local cultures.','Does globalization strengthen cultural exchange or weaken local traditions?')
    ]),

    // C1 · Nuanced analysis and evidence-based discussion
    makeTopic('C1','c1-tech-ethics','🤖','Ética y tecnología','Ethics and technology',[
      makeSubtopic('Artificial intelligence','Analyze accountability, benefits, and risks in AI systems.','Who should be accountable when an AI system causes harm?'),
      makeSubtopic('Privacy and surveillance','Examine trade-offs between privacy, security, and convenience.','What limits should society place on digital surveillance?'),
      makeSubtopic('Automation and employment','Evaluate how automation distributes opportunity and disruption.','How should societies respond when automation replaces established jobs?')
    ]),
    makeTopic('C1','c1-global','🌐','Desafíos globales','Global challenges',[
      makeSubtopic('Climate responsibility','Compare the responsibilities of nations with different resources.','How should climate responsibilities be shared between wealthy and developing nations?'),
      makeSubtopic('Migration','Discuss the causes and effects of migration on communities.','How can countries protect migrants while addressing local concerns?'),
      makeSubtopic('Economic inequality','Analyze structural causes and possible policy responses.','Which policies are most likely to reduce economic inequality over time?')
    ]),
    makeTopic('C1','c1-education','📚','Educación y pensamiento crítico','Education and critical thinking',[
      makeSubtopic('Higher education','Evaluate the purpose and accessibility of universities.','How should universities balance academic knowledge with practical preparation?'),
      makeSubtopic('Curriculum design','Discuss what knowledge and skills schools should prioritize.','Who should decide what belongs in a modern school curriculum?'),
      makeSubtopic('Lifelong learning','Explore how people can keep learning through career and social change.','Why has lifelong learning become essential in modern professional life?')
    ]),
    makeTopic('C1','c1-culture-media','🎬','Cultura y medios','Culture and media',[
      makeSubtopic('Art and public funding','Consider the social value and public support of the arts.','Should public funding prioritize widely accessible art or experimental work?'),
      makeSubtopic('Censorship','Examine the boundary between harmful content and freedom of expression.','Under what circumstances, if any, is censorship justified?'),
      makeSubtopic('Misinformation','Analyze why misinformation spreads and how institutions should respond.','Which strategies can reduce misinformation without restricting legitimate debate?')
    ]),

    // C2 · Historical, philosophical, and geopolitical debate
    makeTopic('C2','c2-history','🏛️','Historia del siglo XX','Twentieth-century history',[
      makeSubtopic('The Second World War','Analyze causes, turning points, and lasting historical interpretations.','Which causes of the Second World War are most significant, and how do historians weigh them?'),
      makeSubtopic('The Cold War','Examine ideological rivalry, proxy conflicts, and global consequences.','To what extent was the Cold War driven by ideology rather than security interests?'),
      makeSubtopic('Decolonization','Discuss independence movements and the legacies of colonial rule.','How should the long-term consequences of decolonization be evaluated?')
    ]),
    makeTopic('C2','c2-relations','🕊️','Geopolítica y relaciones internacionales','Geopolitics and international relations',[
      makeSubtopic('Diplomacy and alliances','Evaluate how alliances shape negotiation and international stability.','When do alliances prevent conflict, and when can they intensify it?'),
      makeSubtopic('International conflicts','Examine the causes and limits of intervention in modern conflicts.','What principles should guide international intervention in a conflict?'),
      makeSubtopic('Global institutions','Assess how international organizations influence cooperation and sovereignty.','Do global institutions have enough authority to address shared problems effectively?')
    ]),
    makeTopic('C2','c2-philosophy','⚖️','Filosofía política y políticas públicas','Political philosophy and public policy',[
      makeSubtopic('Democracy','Analyze democratic legitimacy, participation, and institutional limits.','What conditions are necessary for a democracy to remain legitimate?'),
      makeSubtopic('Justice and equality','Compare competing accounts of fairness and equal opportunity.','Should public policy prioritize equal outcomes or equal opportunities?'),
      makeSubtopic('Freedom and governance','Examine tensions between individual liberty and collective authority.','How should governments balance individual freedom with the common good?')
    ]),
    makeTopic('C2','c2-science','🧬','Ciencia, bioética y futuro','Science, bioethics, and the future',[
      makeSubtopic('Gene editing','Consider consent, fairness, and risk in human genetic intervention.','Under what conditions, if any, is editing the human genome ethically defensible?'),
      makeSubtopic('AI and human judgment','Examine whether automated decisions can be legitimate in high-stakes settings.','Can algorithmic decisions be trusted in domains that require moral judgment?'),
      makeSubtopic('Space exploration','Debate scientific value, commercial interests, and responsibility beyond Earth.','Who should govern the use of resources and territory beyond Earth?')
    ])
  ];
}

VOCAL_DATA.topics = createLevelTopics();

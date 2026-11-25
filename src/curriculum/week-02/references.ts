type WeekTwoReference = {
  id: string;
  short: string;
  citation: string;
  locator: string;
  links: readonly { label: string; url: string }[];
  localPath?: string;
};

export const weekTwoReferences = [
  {
    id: 'doroudi',
    short: 'Two strands of AI and education history',
    citation:
      'Doroudi, S. (2023). The intertwined histories of artificial intelligence and education. International Journal of Artificial Intelligence in Education, 33, 885–928.',
    locator:
      'Figure 1 and the surrounding text trace tutoring systems and learner-directed environments as parallel strands. The article appeared online in 2022 and in its journal issue in 2023.',
    links: [
      {
        label: 'Read the open history paper',
        url: 'https://link.springer.com/article/10.1007/s40593-022-00313-2',
      },
    ],
  },
  {
    id: 'rismanchian-doroudi',
    short: 'Four decades of AIED research',
    citation:
      'Rismanchian, S., & Doroudi, S. (2025). The evolution of research on AI and education across four decades: Insights from the AIxEd framework. International Journal of Artificial Intelligence in Education, 35, 2797–2820.',
    locator:
      'The authors compare selected years of AIED conference and journal publications and discuss generative AI.',
    links: [
      {
        label: 'Read the open four-decade analysis',
        url: 'https://link.springer.com/article/10.1007/s40593-025-00483-9',
      },
    ],
  },
  {
    id: 'skinner',
    short: 'Teaching machines',
    citation: 'Skinner, B. F. (1958). Teaching machines. Science, 128(3330), 969–977.',
    locator:
      'Figure 2 shows the machine that lets learners compare a written response with the expected answer and record their own judgment.',
    links: [
      {
        label: 'Read the article reprint (PDF)',
        url: 'https://www.bfskinner.org/wp-content/uploads/2014/02/teaching-machines-1958.pdf',
      },
      { label: 'Open the Science publication record', url: 'https://doi.org/10.1126/science.128.3330.969' },
    ],
  },
  {
    id: 'carbonell',
    short: 'SCHOLAR',
    citation:
      'Carbonell, J. R. (1970). AI in CAI: An artificial-intelligence approach to computer-assisted instruction. IEEE Transactions on Man-Machine Systems, 11(4), 190–202.',
    locator:
      'The paper describes the network of geography facts that supported a dialogue between student and computer.',
    links: [
      { label: 'Open the IEEE publication record', url: 'https://doi.org/10.1109/TMMS.1970.299942' },
      {
        label: 'Read Carbonell and Collins’s related technical report at ERIC',
        url: 'https://eric.ed.gov/?id=ED049630',
      },
    ],
  },
  {
    id: 'papert',
    short: 'Mindstorms and Logo',
    citation: 'Papert, S. (1980). Mindstorms: Children, computers, and powerful ideas. Basic Books.',
    locator:
      'Chapter 3, “Turtle Geometry: A Mathematics Made for Learning,” explores how learners can try out geometric ideas by giving a turtle commands.',
    links: [
      {
        label: 'Open Mindstorms at the MIT Media Lab',
        url: 'https://www.media.mit.edu/publications/mindstorms/',
      },
    ],
  },
  {
    id: 'anderson',
    short: 'Assigned reading · Cognitive tutors',
    citation:
      'Anderson, J. R., Corbett, A. T., Koedinger, K. R., & Pelletier, R. (1995). Cognitive tutors: Lessons learned. Journal of the Learning Sciences, 4(2), 167–207.',
    locator:
      'For Case Note 1, revisit the error-feedback example and model-tracing explanation on pp. 171–173. See Canvas for the assigned selection.',
    localPath: 'readings/Week 02 - Anderson et al. (1995) - Cognitive Tutors.pdf',
    links: [
      {
        label: 'Read the paper at Carnegie Mellon (PDF)',
        url: 'https://pact.cs.cmu.edu/pubs/Anderson-CKP-95.pdf',
      },
      { label: 'Open the journal publication record', url: 'https://doi.org/10.1207/s15327809jls0402_2' },
    ],
  },
  {
    id: 'kulik-fletcher',
    short: 'Research on intelligent tutoring outcomes',
    citation:
      'Kulik, J. A., & Fletcher, J. D. (2016). Effectiveness of intelligent tutoring systems: A meta-analytic review. Review of Educational Research, 86(1), 42–78.',
    locator:
      'The abstract summarizes 50 controlled evaluations and describes how findings varied with the assessments, comparison groups, and how a tutor was used.',
    links: [
      {
        label: 'Open the journal abstract',
        url: 'https://journals.sagepub.com/doi/10.3102/0034654315581420',
      },
    ],
  },
  {
    id: 'leelawong-biswas',
    short: 'Betty’s Brain',
    citation:
      'Leelawong, K., & Biswas, G. (2008). Designing learning by teaching agents: The Betty’s Brain system. International Journal of Artificial Intelligence in Education, 18(3), 181–208.',
    locator:
      'The system description shows how students teach an agent with a causal map and inspect its reasoning.',
    links: [
      {
        label: 'Open the journal abstract',
        url: 'https://journals.sagepub.com/doi/abs/10.3233/IRG-2008-18%283%2902',
      },
    ],
  },
  {
    id: 'muralidharan',
    short: 'Mindspark in India',
    citation:
      'Muralidharan, K., Singh, A., & Ganimian, A. J. (2019). Disrupting education? Experimental evidence on technology-aided instruction in India. American Economic Review, 109(4), 1426–1460.',
    locator:
      'The program description specifies both computer sessions and small-group instruction. Read the abstract for the lottery and outcomes.',
    links: [
      {
        label: 'Open the American Economic Association article',
        url: 'https://www.aeaweb.org/articles?id=10.1257/aer.20171112',
      },
      {
        label: 'Read the authors’ paper (PDF)',
        url: 'https://alejandroganimian.com/files/20190216_Disrupting_education.pdf',
      },
    ],
  },
  {
    id: 'openai',
    short: 'ChatGPT public preview',
    citation: 'OpenAI. (2022, November 30). Introducing ChatGPT.',
    locator: 'This announcement dates the public preview and describes conversation and its limitations.',
    links: [{ label: 'Read the launch announcement', url: 'https://openai.com/index/chatgpt/' }],
  },
  {
    id: 'bastani',
    short: 'Practice with AI and an independent exam',
    citation:
      'Bastani, H., Bastani, O., Sungu, A., Ge, H., Kabakcı, Ö., & Mariman, R. (2025). Generative AI without guardrails can harm learning: Evidence from high school mathematics. Proceedings of the National Academy of Sciences, 122(26), e2422633122.',
    locator:
      'Table 1 and the results compare assisted practice and unassisted exam performance in three study groups.',
    links: [
      { label: 'Open the PNAS article', url: 'https://doi.org/10.1073/pnas.2422633122' },
      {
        label: 'Read the article in PubMed Central',
        url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC12232635/',
      },
      {
        label: 'Read the author-hosted research paper (PDF)',
        url: 'https://hamsabastani.github.io/education_llm.pdf',
      },
    ],
  },
] as const satisfies readonly WeekTwoReference[];

export type WeekTwoReferenceId = (typeof weekTwoReferences)[number]['id'];

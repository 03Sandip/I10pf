// api.js - mock data for landing page; replace with real API endpoints later
const GnAPI = (function(){
  const NOTES = [
    { id:'n1', title:'Engineering Mathematics - Sem 1', stream:'Engineering', semester:'1', price:89, img:'assets/note1.jpg', previewUrl:'assets/sample-note-preview.pdf', description:'Solved problems & lecture notes.' },
    { id:'n2', title:'Organic Chemistry - Sem 3', stream:'Science', semester:'3', price:79, img:'assets/note2.jpg', previewUrl:'assets/sample-note-preview.pdf', description:'Reactions, mechanisms and summaries.' },
    { id:'n3', title:'Microeconomics - Sem 2', stream:'Commerce', semester:'2', price:59, img:'assets/note3.jpg', previewUrl:'assets/sample-note-preview.pdf', description:'Key graphs and example problems.' },
    { id:'n4', title:'Data Structures - Sem 4', stream:'Engineering', semester:'4', price:129, img:'assets/note4.jpg', previewUrl:'assets/sample-note-preview.pdf', description:'Theory + code snippets.' },
    { id:'n5', title:'Linear Algebra - Sem 2', stream:'Science', semester:'2', price:69, img:'assets/note5.jpg', previewUrl:'assets/sample-note-preview.pdf', description:'Matrices, vectors, eigenvalues.' },
    // ...more
  ];

  const ARTICLES = [
    { id:'a1', title:'How to Make Quick Revision Notes', img:'assets/article1.jpg', excerpt:'Techniques to summarize chapters for fast recall.' },
    { id:'a2', title:'Top 10 Tips for Semester Exams', img:'assets/article2.jpg', excerpt:'Study plans & time management.' },
    { id:'a3', title:'Using Sample Notes Effectively', img:'assets/article3.jpg', excerpt:'How to extract high-yield points.' }
  ];

  const HERO = [
    { id:'h1', title:'Exam-ready notes, organized', subtitle:'Concise notes by semester & stream.', img:'assets/hero1.jpg' },
    { id:'h2', title:'Preview before you buy', subtitle:'Open a sample page to check the quality.', img:'assets/hero2.jpg' }
  ];

  const BENEFITS = [
    {icon:'📚', label:'Curated Content'},
    {icon:'🔍', label:'Preview Available'},
    {icon:'⚡', label:'Quick Download'},
    {icon:'💳', label:'Secure Payments'}
  ];

  function simulate(v, ms=150){ return new Promise(r=>setTimeout(()=>r(v), ms)); }

  return {
    fetchNotes: ()=> simulate(NOTES.slice()),
    fetchFeatured: ()=> simulate(NOTES.slice(0,4)),
    fetchPopular: ()=> simulate(NOTES.slice(0,8)),
    fetchOffers: ()=> simulate(NOTES.slice(1,4)),
    fetchArticles: ()=> simulate(ARTICLES.slice()),
    fetchHero: ()=> simulate(HERO.slice()),
    fetchBenefits: ()=> simulate(BENEFITS.slice()),
    getNoteById: (id)=> simulate(NOTES.find(n=>n.id===id))
  };
})();

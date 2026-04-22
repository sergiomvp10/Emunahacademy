import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import { useLanguage } from '../context/LanguageContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { 
  GraduationCap, BookOpen, Users, Brain, Heart, Shield,
  ChevronDown, ChevronUp, CheckCircle, Send, Menu, X, Globe, Bot, MessageCircle, Sparkles, Clock,
  Phone, Mail, MapPin, ChevronLeft, ChevronRight, Check
} from 'lucide-react';

interface SiteContent {
  hero: {
    title: string;
    subtitle: string;
    cta_primary: string;
    cta_secondary: string;
    hero_image?: string;
  };
  about: {
    title: string;
    description: string;
    mission: string;
    vision: string;
  };
  how_it_works: {
    title: string;
    steps: Array<{ number: string; title: string; description: string }>;
  };
  programs: {
    title: string;
    subtitle: string;
    grades: Array<{ level: string; name: string; description: string }>;
  };
  impact: {
    title: string;
    stats: Array<{ number: string; label: string }>;
  };
  faq: {
    title: string;
    questions: Array<{ question: string; answer: string }>;
  };
  contact: {
    title: string;
    email: string;
    phone: string;
    address: string;
  };
}

export function LandingPage() {
  const { language, setLanguage, t } = useLanguage();
  const [content, setContent] = useState<SiteContent | null>(null);
  const [loading, setLoading] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);
  const [applicationSubmitted, setApplicationSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [testimonialIndex, setTestimonialIndex] = useState(0);
  const [formData, setFormData] = useState({
    student_name: '',
    student_age: '',
    grade_level: '',
    parent_name: '',
    parent_email: '',
    parent_phone: '',
    address: '',
    message: '',
    has_esa: false
  });

  useEffect(() => {
    loadContent();
  }, [language]);

  const loadContent = async () => {
    try {
      const data = await api.getSiteContent(language) as unknown as SiteContent;
      setContent(data);
    } catch (error) {
      console.error('Error loading site content:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitApplication = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.submitApplication({
        student_name: formData.student_name,
        student_age: parseInt(formData.student_age),
        grade_level: formData.grade_level,
        parent_name: formData.parent_name,
        parent_email: formData.parent_email,
        parent_phone: formData.parent_phone,
        address: formData.address || undefined,
        message: formData.message || undefined,
        has_esa: formData.has_esa
      });
      setApplicationSubmitted(true);
    } catch (error) {
      console.error('Error submitting application:', error);
      alert('Error submitting application. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
    setMobileMenuOpen(false);
  };

  const testimonials = language === 'es' ? [
    { text: 'Emunah Academy ha tenido un impacto tan positivo en mi hijo y, a su vez, en toda nuestra familia. Trabaja de manera completamente independiente, tiene menos ansiedad y ha ganado mucha confianza en si mismo.', author: 'Maria G.' },
    { text: 'La atencion personalizada que recibe mi hija es increible. Los profesores realmente se preocupan por cada estudiante y adaptan la ensenanza a sus necesidades individuales.', author: 'Carlos R.' },
    { text: 'Desde que mi hijo ingreso a Emunah Academy, su rendimiento academico ha mejorado dramaticamente. El ambiente de apoyo marca toda la diferencia.', author: 'Ana P.' },
  ] : [
    { text: 'Emunah Academy has had such a positive impact on my son, and in turn our whole family. He works completely independently on his own, has less anxiety, and has even gained a lot of self confidence.', author: 'Maria G.' },
    { text: 'The personalized attention my daughter receives is incredible. The teachers truly care about every student and adapt their teaching to individual needs.', author: 'Carlos R.' },
    { text: 'Since my son joined Emunah Academy, his academic performance has improved dramatically. The supportive environment makes all the difference.', author: 'Ana P.' },
  ];

  const featureCards = language === 'es' ? [
    { icon: Users, title: 'Instruccion Uno a Uno', description: 'Su hijo sera emparejado con un profesor experimentado enfocado en encontrarlo donde esta y ayudarlo a progresar.', color: 'bg-teal-500' },
    { icon: Brain, title: 'Aprendizaje Basado en Dominio', description: 'Nos aseguramos de que su hijo comprenda los conceptos y habilidades presentados en cada leccion con multiples enfoques.', color: 'bg-gray-500' },
    { icon: BookOpen, title: 'Plan de Aprendizaje Personalizado', description: 'Nuestros planes de instruccion abordan las fortalezas y debilidades unicas de cada estudiante en cada materia.', color: 'bg-blue-600' },
    { icon: Heart, title: 'Ambiente de Apoyo y Cuidado', description: 'Queremos que su hijo desarrolle confianza en sus habilidades. Celebramos logros y fomentamos la persistencia.', color: 'bg-teal-600' },
  ] : [
    { icon: Users, title: 'One-to-One Instruction', description: 'Your child will be matched with an experienced teacher focused on meeting them where they are and helping them make great progress.', color: 'bg-teal-500' },
    { icon: Brain, title: 'Mastery Based Learning', description: 'We ensure your child understands the concepts and skills presented in each lesson with multiple different approaches.', color: 'bg-gray-500' },
    { icon: BookOpen, title: 'Customized Learning Plan', description: "Our instructional plans address each student's unique strengths and weaknesses across every subject area.", color: 'bg-blue-600' },
    { icon: Heart, title: 'Nurturing, Supportive Atmosphere', description: 'We want your child to build confidence in their abilities. We celebrate wins and encourage persistence.', color: 'bg-teal-600' },
  ];

  const advantages = language === 'es' ? [
    'Ritmo individualizado adaptado a las necesidades de su hijo',
    'Metodos de ensenanza alineados con el estilo de aprendizaje unico de su hijo',
    'Apoyo para estudiantes que estan 1-5 niveles de grado por detras',
    'Estrategias de aprendizaje exclusivas no ensenadas comunmente en escuelas tradicionales',
    'Personalizacion enfocada en las fortalezas y areas de mejora de su hijo',
    'Horarios flexibles para acomodar la vida familiar ocupada',
  ] : [
    "Individualized pace tailored to your child's needs",
    "Teaching methods aligned with your child's unique learning style",
    'Support for students lagging 1-5 grade levels behind',
    'Exclusive learning strategies not commonly taught in traditional schools',
    "Customization focusing on your child's strengths and areas for improvement",
    'Flexible scheduling to accommodate busy family lives',
  ];

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-teal-500 to-blue-600">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
      </div>
    );
  }

  if (!content) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-gray-500">Error loading content</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 bg-white/95 backdrop-blur-sm shadow-sm z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-20">
            <div className="flex items-center gap-3">
              <img src="/emunah-logo.png" alt="Emunah Academy" className="h-16 w-16 rounded-xl object-cover shadow-md" />
              <div>
                <span className="font-bold text-2xl text-gray-800">Emunah</span>
                <span className="font-light text-2xl text-gray-800"> Academy</span>
              </div>
            </div>

                        {/* Desktop Navigation */}
                        <nav className="hidden md:flex items-center gap-6">
                          <button onClick={() => scrollToSection('about')} className="text-gray-600 hover:text-teal-600 transition-colors">{t.landing.nav.about}</button>
                          <button onClick={() => scrollToSection('programs')} className="text-gray-600                           hover:text-teal-600 transition-colors">{t.landing.nav.programs}</button>
                                                    <button onClick={() => scrollToSection('how-it-works')} className="text-gray-600 hover:text-teal-600 transition-colors">{t.landing.nav.howItWorks}</button>
                                                    <button onClick={() => scrollToSection('faq')} className="text-gray-600 hover:text-teal-600 transition-colors">{t.landing.nav.faq}</button>
                          <Link to="/login?role=parent">
                            <Button className="rounded-full px-5 bg-sky-500 hover:bg-sky-600 text-white shadow-md font-semibold tracking-wide">
                              {t.landing.nav.parentSignIn}
                            </Button>
                          </Link>
                          <Link to="/login?role=student">
                            <Button className="rounded-full px-5 bg-emerald-500 hover:bg-emerald-600 text-white shadow-md font-semibold tracking-wide">
                              {t.landing.nav.studentSignIn}
                            </Button>
                          </Link>
                          {content.contact.phone && (
                            <a href={`tel:${content.contact.phone}`}>
                              <Button className="                              bg-teal-500 hover:bg-teal-600 text-white">
                                                              <Phone className="h-4 w-4 mr-2" />
                                                              {content.contact.phone}
                              </Button>
                            </a>
                          )}
                        </nav>

                        {/* Language Switch + Mobile Menu Button */}
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setLanguage(language === 'es' ? 'en' : 'es')}
                            className="flex items-center gap-1 px-2 py-1 rounded-md hover:bg-gray-100 transition-colors text-gray-600"
                            title={language === 'es' ? 'Switch to English' : 'Cambiar a Espanol'}
                          >
                            <Globe className="h-4 w-4" />
                            <span className="text-xs font-medium uppercase">{language}</span>
                          </button>
                          <button 
                            className="md:hidden p-2"
                            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                          >
                            {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
                          </button>
                        </div>
          </div>
        </div>

                {/* Mobile Navigation */}
                {mobileMenuOpen && (
                  <div className="md:hidden bg-white border-t">
                    <div className="px-4 py-4 space-y-3">
                      <button onClick={() => scrollToSection('about')} className="block w-full text-left text-gray-600                       hover:text-teal-600">{t.landing.nav.about}</button>
                                            <button onClick={() => scrollToSection('programs')} className="block w-full text-left text-gray-600 hover:text-teal-600">{t.landing.nav.programs}</button>
                                            <button onClick={() => scrollToSection('how-it-works')} className="block w-full text-left text-gray-600 hover:text-teal-600">{t.landing.nav.howItWorks}</button>
                                            <button onClick={() => scrollToSection('faq')} className="block w-full text-left text-gray-600 hover:text-teal-600">{t.landing.nav.faq}</button>
                      <Link to="/login?role=parent" className="block">
                        <Button className="w-full rounded-full bg-sky-500 hover:bg-sky-600 text-white font-semibold">{t.landing.nav.parentSignIn}</Button>
                      </Link>
                      <Link to="/login?role=student" className="block">
                        <Button className="w-full rounded-full bg-emerald-500 hover:bg-emerald-600 text-white font-semibold">{t.landing.nav.studentSignIn}</Button>
                      </Link>
                    </div>
                  </div>
                )}
      </header>

      {/* Hero Section - Brightmont Style */}
      <section className="pt-16 relative overflow-hidden" style={{ minHeight: '700px' }}>
        {/* Background gradient - teal/blue */}
        <div className="absolute inset-0 bg-gradient-to-br from-teal-500 via-teal-600 to-blue-600">
          <div className="absolute left-0 top-0 bottom-0 w-1/3">
            <svg viewBox="0 0 400 700" className="h-full w-full opacity-20" preserveAspectRatio="xMinYMin slice">
              <polygon points="200,50 350,125 350,275 200,350 50,275 50,125" fill="currentColor" className="text-teal-700" />
              <polygon points="200,200 350,275 350,425 200,500 50,425 50,275" fill="currentColor" className="text-teal-800" />
              <polygon points="200,350 350,425 350,575 200,650 50,575 50,425" fill="currentColor" className="text-teal-700" />
            </svg>
          </div>
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 lg:py-24">
          <div className="grid lg:grid-cols-2 gap-12 items-start">
            {/* Left side - Title + Image */}
            <div className="flex flex-col justify-center">
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-4 leading-tight drop-shadow-lg">
                {content.hero.title}
              </h1>
              <p className="text-lg md:text-xl text-white/90 mb-8 font-light leading-relaxed">
                {content.hero.subtitle}
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <Button 
                  size="lg" 
                  className="bg-white text-teal-600 hover:bg-teal-50"
                  onClick={() => scrollToSection('apply')}
                >
                  {content.hero.cta_primary}
                </Button>
                <Button 
                  size="lg" 
                  variant="outline" 
                  className="border-white bg-transparent hover:bg-white/10 [&]:text-white"
                  onClick={() => scrollToSection('about')}
                >
                  {content.hero.cta_secondary}
                </Button>
              </div>
              {content.hero.hero_image && (
                <div className="mt-8 hidden md:block">
                  <img 
                    src={content.hero.hero_image} 
                    alt="Emunah Academy" 
                    className="rounded-2xl shadow-2xl max-h-80 object-cover"
                  />
                </div>
              )}
            </div>

            {/* Right side - Quick Apply Form (Brightmont style) */}
            <div className="bg-white rounded-xl shadow-2xl p-8 border-t-4 border-teal-500">
              <h4 className="text-2xl font-bold text-gray-800 mb-2">{t.landing.form.applyNow}</h4>
              <p className="text-gray-500 text-sm mb-6">{t.landing.form.fillForm}</p>
              <form onSubmit={handleSubmitApplication} className="space-y-4">
                {applicationSubmitted ? (
                  <div className="text-center py-8">
                    <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <CheckCircle className="h-8 w-8 text-green-600" />
                    </div>
                    <h3 className="text-xl font-bold text-gray-800 mb-2">{t.landing.form.applicationSubmitted}</h3>
                    <p className="text-gray-600">{t.landing.form.applicationReceived}</p>
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label htmlFor="hero_student_name" className="text-sm font-semibold text-gray-700">{t.landing.form.studentName}*</Label>
                        <Input id="hero_student_name" value={formData.student_name} onChange={(e) => setFormData({ ...formData, student_name: e.target.value })} required className="mt-1" />
                      </div>
                      <div>
                        <Label htmlFor="hero_student_age" className="text-sm font-semibold text-gray-700">{t.landing.form.studentAge}*</Label>
                        <Input id="hero_student_age" type="number" min="4" max="18" value={formData.student_age} onChange={(e) => setFormData({ ...formData, student_age: e.target.value })} required className="mt-1" />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label htmlFor="hero_parent_name" className="text-sm font-semibold text-gray-700">{t.landing.form.parentName}*</Label>
                        <Input id="hero_parent_name" value={formData.parent_name} onChange={(e) => setFormData({ ...formData, parent_name: e.target.value })} required className="mt-1" />
                      </div>
                      <div>
                        <Label htmlFor="hero_parent_email" className="text-sm font-semibold text-gray-700">{t.landing.form.emailAddress}*</Label>
                        <Input id="hero_parent_email" type="email" value={formData.parent_email} onChange={(e) => setFormData({ ...formData, parent_email: e.target.value })} required className="mt-1" />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label htmlFor="hero_parent_phone" className="text-sm font-semibold text-gray-700">{t.landing.form.phoneNumber}*</Label>
                        <Input id="hero_parent_phone" type="tel" value={formData.parent_phone} onChange={(e) => setFormData({ ...formData, parent_phone: e.target.value })} required className="mt-1" />
                      </div>
                      <div>
                        <Label htmlFor="hero_grade" className="text-sm font-semibold text-gray-700">{t.landing.form.gradeLevel}*</Label>
                        <Select value={formData.grade_level} onValueChange={(value) => setFormData({ ...formData, grade_level: value })}>
                          <SelectTrigger className="mt-1"><SelectValue placeholder={t.landing.form.selectGrade} /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="K">{t.landing.gradeOptions.kindergarten}</SelectItem>
                            <SelectItem value="1">{t.landing.gradeOptions.grade1}</SelectItem>
                            <SelectItem value="2">{t.landing.gradeOptions.grade2}</SelectItem>
                            <SelectItem value="3">{t.landing.gradeOptions.grade3}</SelectItem>
                            <SelectItem value="4">{t.landing.gradeOptions.grade4}</SelectItem>
                            <SelectItem value="5">{t.landing.gradeOptions.grade5}</SelectItem>
                            <SelectItem value="6">{t.landing.gradeOptions.grade6}</SelectItem>
                            <SelectItem value="7">{t.landing.gradeOptions.grade7}</SelectItem>
                            <SelectItem value="8">{t.landing.gradeOptions.grade8}</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        id="hero_has_esa"
                        checked={formData.has_esa}
                        onChange={(e) => setFormData({ ...formData, has_esa: e.target.checked })}
                        className="h-5 w-5 rounded border-gray-300 text-teal-600 focus:ring-teal-500"
                      />
                      <Label htmlFor="hero_has_esa" className="cursor-pointer text-sm font-semibold text-gray-700">
                        {t.landing.form.hasEsa}
                      </Label>
                    </div>
                    <Button
                      type="submit"
                      className="w-full bg-teal-500 hover:bg-teal-600 text-white text-lg py-5"
                                  disabled={submitting || !formData.student_name || !formData.student_age || !formData.parent_name || !formData.parent_email || !formData.parent_phone || !formData.grade_level}
                                >
                                  {submitting ? (
                                    <span className="flex items-center gap-2">
                                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                      {t.landing.form.submitting}
                                    </span>
                                  ) : (
                                    <span className="flex items-center gap-2">
                                      <Send className="h-5 w-5" />
                                      {t.landing.form.submitApplication}
                                    </span>
                                  )}
                                </Button>
                              </>
                            )}
                          </form>
                        </div>
          </div>
        </div>
      </section>

      {/* Feature Cards Section - Brightmont Style */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-6">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-800 italic">
              {language === 'es' ? 'Educacion Personalizada para Cada Estudiante' : 'Personalized Education for Every Learner'}
            </h2>
          </div>
          <p className="text-gray-600 text-center max-w-4xl mx-auto mb-12 text-lg">
            {language === 'es'
              ? 'Nuestro metodo de ensenanza uno a uno enfatiza los requisitos academicos individuales y las preferencias de aprendizaje de cada estudiante.'
              : "Our tailored one-on-one teaching method emphasizes each student's individual academic requirements and learning preferences."}
          </p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {featureCards.map((card, index) => {
              const IconComponent = card.icon;
              return (
                <div key={index} className={`${card.color} rounded-xl p-8 text-white flex flex-col min-h-[280px]`}>
                  <div className="mb-6">
                    <div className="w-14 h-14 bg-white/20 rounded-lg flex items-center justify-center">
                      <IconComponent className="h-8 w-8 text-white" />
                    </div>
                  </div>
                  <h5 className="text-xl font-bold mb-4 leading-tight">{card.title}</h5>
                  <p className="text-white/90 text-sm leading-relaxed">{card.description}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Empowering Section - Image + Checklist */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="flex justify-center">
              {content.hero.hero_image ? (
                <img src={content.hero.hero_image} alt="Students learning" className="rounded-2xl shadow-xl max-h-96 object-cover" />
              ) : (
                <div className="bg-gradient-to-br from-teal-500 to-blue-600 rounded-2xl p-12 flex items-center justify-center">
                  <GraduationCap className="h-40 w-40 text-white/80" />
                </div>
              )}
            </div>
            <div>
              <h3 className="text-3xl md:text-4xl               font-bold text-gray-800 mb-4">
                              {language === 'es' ? 'Empoderando a su Hijo K-8 con Aprendizaje Personalizado' : 'Empowering Your K-8 Child with Personalized Learning'}
              </h3>
              <h4 className="text-lg text-gray-600 mb-8">
                {language === 'es' ? 'Descubra las ventajas de nuestro enfoque totalmente personalizado para cada estudiante:' : 'Discover the advantages of our fully customized approach for every student:'}
              </h4>
              <ul className="space-y-4">
                {advantages.map((advantage, index) => (
                  <li key={index} className="flex items-start gap-3">
                    <div className="flex-shrink-0 w-6 h-6 bg-teal-500 rounded-full flex items-center justify-center mt-0.5">
                      <Check className="h-4 w-4 text-white" />
                    </div>
                    <span className="text-gray-700 text-lg">{advantage}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Impact Stats - Brightmont Style */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-4">
            <h3 className="text-3xl md:text-4xl             font-bold text-gray-800">
                          {language === 'es' ? 'Nuestro Enfoque' : 'Our Approach'}
            </h3>
          </div>
          <p className="text-center text-gray-600 text-lg mb-12 max-w-3xl mx-auto">
            {language === 'es' ? 'Estudiantes y padres aman el enfoque unico de Emunah Academy:' : "Students and parents love Emunah Academy's unique approach:"}
          </p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {content.impact.stats.map((stat, index) => {
              const bgColors = ['bg-teal-500', 'bg-blue-600', 'bg-gray-600', 'bg-teal-600'];
              return (
                <div key={index} className={`${bgColors[index % bgColors.length]} rounded-xl p-8 text-white text-center`}>
                  <div className="text-5xl md:text-6xl font-bold mb-3">{stat.number}</div>
                  <p className="text-white/90 text-sm leading-relaxed">{stat.label}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* About Section */}
      <section id="about" className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-800 mb-4">{content.about.title}</h2>
            <p className="text-lg text-gray-600 max-w-3xl mx-auto">{content.about.description}</p>
          </div>
                    <div className="grid md:grid-cols-2 gap-8">
                      <Card className="border-l-4 border-l-teal-500">
                        <CardContent className="p-6">
                          <div className="flex items-center gap-3 mb-3">
                            <div className="w-10 h-10                             bg-teal-500 rounded-lg flex items-center justify-center">
                                                          <Shield className="h-5 w-5 text-white" />
                                                        </div>
                                                        <h3 className="text-xl font-semibold text-gray-800">{t.landing.sections.ourMission}</h3>
                          </div>
                          <p className="text-gray-600">{content.about.mission}</p>
                        </CardContent>
                      </Card>
                      <Card className="border-l-4 border-l-blue-500">
                        <CardContent className="p-6">
                          <div className="flex items-center gap-3 mb-3">
                            <div className="w-10 h-10                             bg-blue-500 rounded-lg flex items-center justify-center">
                                                          <GraduationCap className="h-5 w-5 text-white" />
                                                        </div>
                                                        <h3 className="text-xl font-semibold text-gray-800">{t.landing.sections.ourVision}</h3>
                          </div>
                          <p className="text-gray-600">{content.about.vision}</p>
                        </CardContent>
                      </Card>
                    </div>
        </div>
      </section>

      {/* AI Tutor Section */}
      <section className="py-20 bg-gradient-to-r       from-purple-600 to-teal-500">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="grid md:grid-cols-2 gap-12 items-center">
                  <div className="text-white">
                    <div className="inline-flex items-center gap-2 bg-white/20 px-4 py-2 rounded-full mb-6">
                <Sparkles className="h-5 w-5" />
                <span className="text-sm font-medium">{language === 'es' ? 'Nueva Funcionalidad' : 'New Feature'}</span>
              </div>
              <h2 className="text-3xl md:text-4xl font-bold mb-6">
                {language === 'es' ? 'Tutor AI Personalizado' : 'Personalized AI Tutor'}
              </h2>
              <p className="text-lg text-white/90 mb-8">
                {language === 'es' 
                  ? 'Implementamos inteligencia artificial para personalizar el aprendizaje de cada estudiante. Nuestro Tutor AI esta disponible 24/7 para responder preguntas, ayudar con tareas y adaptar el contenido al nivel de cada alumno.'
                  : 'We implement artificial intelligence to personalize each student\'s learning. Our AI Tutor is available 24/7 to answer questions, help with homework, and adapt content to each student\'s level.'}
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 text-center">
                  <MessageCircle className="h-8 w-8 mx-auto mb-2" />
                  <p className="text-sm font-medium">{language === 'es' ? 'Chat Interactivo' : 'Interactive Chat'}</p>
                </div>
                <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 text-center">
                  <Sparkles className="h-8 w-8 mx-auto mb-2" />
                  <p className="text-sm font-medium">{language === 'es' ? 'Aprendizaje Adaptativo' : 'Adaptive Learning'}</p>
                </div>
                <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 text-center">
                  <Clock className="h-8 w-8 mx-auto mb-2" />
                  <p className="text-sm font-medium">{language === 'es' ? 'Disponible 24/7' : 'Available 24/7'}</p>
                </div>
              </div>
            </div>
            <div className="hidden md:flex justify-center">
              <div className="relative">
                <div className="absolute inset-0 bg-white/20 rounded-full blur-3xl"></div>
                <div className="relative bg-white/10 backdrop-blur-sm rounded-2xl p-8">
                  <Bot className="h-48 w-48 text-white/80" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-800 mb-4">{content.how_it_works.title}</h2>
          </div>
          <div className="grid md:grid-cols-4 gap-8">
            {content.how_it_works.steps.map((step, index) => (
              <div key={index} className="text-center">
                <div className="w-16 h-16 bg-teal-500 text-white rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-4">
                  {step.number}
                </div>
                <h3 className="text-xl font-semibold text-gray-800 mb-2">{step.title}</h3>
                <p className="text-gray-600">{step.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Programs */}
      <section id="programs" className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-800 mb-4">{content.programs.title}</h2>
            <p className="text-lg text-gray-600">{content.programs.subtitle}</p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {content.programs.grades.map((grade, index) => (
              <Card key={index} className="hover:shadow-lg transition-shadow">
                <CardContent className="p-6">
                  <div className="w-12 h-12 bg-teal-100 text-teal-600 rounded-lg flex items-center justify-center mb-4">
                    <BookOpen className="h-6 w-6" />
                  </div>
                  <div className="text-sm text-teal-600 font-medium mb-1">{grade.level}</div>
                  <h3 className="text-lg font-semibold text-gray-800 mb-2">{grade.name}</h3>
                  <p className="text-gray-600 text-sm">{grade.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-4">
            <h3 className="text-3xl md:text-4xl             font-bold text-gray-800">
                          {language === 'es' ? 'En Emunah, estamos comprometidos a ayudar a cada estudiante y cada familia - a prosperar' : "At Emunah, we're committed to helping each student and each family - thrive"}
            </h3>
          </div>
          <p className="text-center text-gray-600 italic text-lg mb-12 max-w-3xl mx-auto">
            {language === 'es' ? 'Asociarnos con estudiantes y padres para ayudar a cada estudiante a alcanzar su maximo potencial es el corazon de lo que hacemos en Emunah Academy.' : 'Partnering with students and parents to help each student reach their full potential is at the heart of what we do at Emunah Academy.'}
          </p>
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="flex justify-center">
              {content.hero.hero_image ? (
                <img src={content.hero.hero_image} alt="Student learning" className="rounded-2xl shadow-xl max-h-96 object-cover" />
              ) : (
                <div className="bg-gradient-to-br from-teal-100 to-teal-50 rounded-2xl p-12 flex items-center justify-center">
                  <GraduationCap className="h-40 w-40 text-teal-600/30" />
                </div>
              )}
            </div>
            <div className="relative">
              <div className="bg-gradient-to-br from-teal-500 to-blue-600 rounded-2xl p-8 md:p-10 text-white relative">
                <div className="text-6xl font-serif text-white/30 absolute top-4 left-6 leading-none">&ldquo;</div>
                <div className="mt-8">
                  <p className="text-lg md:text-xl leading-relaxed mb-6 min-h-[120px]">
                    {testimonials[testimonialIndex].text}
                  </p>
                  <p className="                  text-teal-200 font-semibold">
                                      -- {testimonials[testimonialIndex].author}
                  </p>
                </div>
                <div className="absolute -bottom-4 left-16 w-8 h-8 bg-teal-500 rotate-45"></div>
              </div>
              <div className="flex items-center justify-center gap-4 mt-8">
                <button onClick={() => setTestimonialIndex((prev) => (prev - 1 + testimonials.length) % testimonials.length)} className="w-10 h-10 rounded-full                 border-2 border-teal-500 flex items-center justify-center text-teal-600 hover:bg-teal-500 hover:text-white transition-colors">
                                  <ChevronLeft className="h-5 w-5" />
                </button>
                <div className="flex gap-2">
                  {testimonials.map((_, index) => (
                    <button key={index} onClick={() => setTestimonialIndex(index)} className={`w-3 h-3 rounded-full transition-colors ${index === testimonialIndex ? 'bg-teal-500' : 'bg-gray-300'}`} />
                  ))}
                </div>
                <button onClick={() => setTestimonialIndex((prev) => (prev + 1) % testimonials.length)} className="w-10 h-10 rounded-full                 border-2 border-teal-500 flex items-center justify-center text-teal-600 hover:bg-teal-500 hover:text-white transition-colors">
                                  <ChevronRight className="h-5 w-5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Application Form */}
      <section id="apply" className="py-20 bg-gradient-to-br       from-teal-500 to-blue-600">
              <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <Card className="shadow-2xl">
            <CardContent className="p-8">
                            {applicationSubmitted ? (
                              <div className="text-center py-12">
                                <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                                  <CheckCircle className="h-10 w-10 text-green-600" />
                                </div>
                                <h3 className="text-2xl font-bold text-gray-800 mb-4">{t.landing.form.applicationSubmitted}</h3>
                                <p className="text-gray-600 text-lg">
                                  {t.landing.form.applicationReceived}
                                </p>
                              </div>
                            ) : (
                              <>
                                <div className="text-center mb-8">
                                  <h2 className="text-2xl md:text-3xl font-bold text-gray-800 mb-2">{t.landing.form.applyNow}</h2>
                                  <p className="text-gray-600">{t.landing.form.fillForm}</p>
                                </div>
                                    <form onSubmit={handleSubmitApplication} className="space-y-6">
                                      <div className="grid md:grid-cols-2 gap-6">
                                        <div>
                                          <Label htmlFor="student_name">{t.landing.form.studentName} *</Label>
                                          <Input
                                            id="student_name"
                                            value={formData.student_name}
                                            onChange={(e) => setFormData({ ...formData, student_name: e.target.value })}
                                            required
                                            placeholder={t.landing.form.studentNamePlaceholder}
                                          />
                                        </div>
                                        <div>
                                          <Label htmlFor="student_age">{t.landing.form.studentAge} *</Label>
                                          <Input
                                            id="student_age"
                                            type="number"
                                            min="4"
                                            max="18"
                                            value={formData.student_age}
                                            onChange={(e) => setFormData({ ...formData, student_age: e.target.value })}
                                            required
                                            placeholder={t.landing.form.studentAgePlaceholder}
                                          />
                                        </div>
                                      </div>
                                      <div>
                                        <Label htmlFor="grade_level">{t.landing.form.gradeLevel} *</Label>
                                        <Select
                                          value={formData.grade_level}
                                          onValueChange={(value) => setFormData({ ...formData, grade_level: value })}
                                        >
                                          <SelectTrigger>
                                            <SelectValue placeholder={t.landing.form.selectGrade} />
                                          </SelectTrigger>
                                          <SelectContent>
                                            <SelectItem value="K">{t.landing.gradeOptions.kindergarten}</SelectItem>
                                            <SelectItem value="1">{t.landing.gradeOptions.grade1}</SelectItem>
                                            <SelectItem value="2">{t.landing.gradeOptions.grade2}</SelectItem>
                                            <SelectItem value="3">{t.landing.gradeOptions.grade3}</SelectItem>
                                            <SelectItem value="4">{t.landing.gradeOptions.grade4}</SelectItem>
                                            <SelectItem value="5">{t.landing.gradeOptions.grade5}</SelectItem>
                                            <SelectItem value="6">{t.landing.gradeOptions.grade6}</SelectItem>
                                            <SelectItem value="7">{t.landing.gradeOptions.grade7}</SelectItem>
                                            <SelectItem value="8">{t.landing.gradeOptions.grade8}</SelectItem>
                                          </SelectContent>
                                        </Select>
                                      </div>
                                      <div className="grid md:grid-cols-2 gap-6">
                                        <div>
                                          <Label htmlFor="parent_name">{t.landing.form.parentName} *</Label>
                                          <Input
                                            id="parent_name"
                                            value={formData.parent_name}
                                            onChange={(e) => setFormData({ ...formData, parent_name: e.target.value })}
                                            required
                                            placeholder={t.landing.form.parentNamePlaceholder}
                                          />
                                        </div>
                                        <div>
                                          <Label htmlFor="parent_email">{t.landing.form.emailAddress} *</Label>
                                          <Input
                                            id="parent_email"
                                            type="email"
                                            value={formData.parent_email}
                                            onChange={(e) => setFormData({ ...formData, parent_email: e.target.value })}
                                            required
                                            placeholder={t.landing.form.emailPlaceholder}
                                          />
                                        </div>
                                      </div>
                                      <div className="grid md:grid-cols-2 gap-6">
                                        <div>
                                          <Label htmlFor="parent_phone">{t.landing.form.phoneNumber} *</Label>
                                          <Input
                                            id="parent_phone"
                                            type="tel"
                                            value={formData.parent_phone}
                                            onChange={(e) => setFormData({ ...formData, parent_phone: e.target.value })}
                                            required
                                            placeholder={t.landing.form.phonePlaceholder}
                                          />
                                        </div>
                                        <div>
                                          <Label htmlFor="address">{t.landing.form.address}</Label>
                                          <Input
                                            id="address"
                                            value={formData.address}
                                            onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                                            placeholder={t.landing.form.addressPlaceholder}
                                          />
                                        </div>
                                      </div>
                                      <div>
                                        <Label htmlFor="message">{t.landing.form.message}</Label>
                                        <Textarea
                                          id="message"
                                          value={formData.message}
                                          onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                                          placeholder={t.landing.form.messagePlaceholder}
                                          rows={3}
                                        />
                                      </div>
                                      <div className="flex items-center gap-3">
                                        <input
                                          type="checkbox"
                                          id="has_esa"
                                          checked={formData.has_esa}
                                          onChange={(e) => setFormData({ ...formData, has_esa: e.target.checked })}
                                          className="h-5 w-5 rounded border-gray-300 text-teal-600 focus:ring-teal-500"
                                        />
                                        <Label htmlFor="has_esa" className="cursor-pointer">
                                          {t.landing.form.hasEsa}
                                        </Label>
                                      </div>
                                      <Button
                                        type="submit" 
                                        className="w-full bg-teal-500 hover:bg-teal-600"
                                        disabled={submitting || !formData.student_name || !formData.student_age || !formData.grade_level || !formData.parent_name || !formData.parent_email || !formData.parent_phone}
                                      >
                                        {submitting ? (
                                          <span className="flex items-center gap-2">
                                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                            {t.landing.form.submitting}
                                          </span>
                                        ) : (
                                          <span className="flex items-center gap-2">
                                            <Send className="h-4 w-4" />
                                            {t.landing.form.submitApplication}
                                          </span>
                                        )}
                                      </Button>
                                    </form>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="py-20 bg-gray-50">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-800 mb-4">{content.faq.title}</h2>
          </div>
          <div className="space-y-4">
            {content.faq.questions.map((faq, index) => (
              <Card key={index} className="overflow-hidden">
                <button
                  className="w-full p-6 text-left flex items-center justify-between hover:bg-gray-50 transition-colors"
                  onClick={() => setExpandedFaq(expandedFaq === index ? null : index)}
                >
                  <span className="font-medium text-gray-800">{faq.question}</span>
                  {expandedFaq === index ? (
                    <ChevronUp className="h-5 w-5 text-gray-500" />
                  ) : (
                    <ChevronDown className="h-5 w-5 text-gray-500" />
                  )}
                </button>
                {expandedFaq === index && (
                  <div className="px-6 pb-6 text-gray-600">
                    {faq.answer}
                  </div>
                )}
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Banner */}
      <section className="py-16 bg-gradient-to-r       from-teal-500 to-blue-600">
              <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h3 className="text-3xl md:text-4xl font-bold text-white mb-4">
            {language === 'es' ? 'Listo para comenzar el viaje educativo?' : 'Ready to start the educational journey?'}
          </h3>
          <p className="text-white/80 text-lg mb-8">
            {language === 'es' ? 'Comuniquese con nosotros hoy y descubra como Emunah Academy puede transformar la educacion de su hijo.' : "Get in touch with us today and discover how Emunah Academy can transform your child's education."}
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" className="bg-white text-teal-600 hover:bg-teal-50 text-lg px-8" onClick={() => scrollToSection('apply')}>
              <Send className="h-5 w-5 mr-2" />
              {t.landing.form.applyNow}
            </Button>
            {content.contact.phone && (
              <a href={`tel:${content.contact.phone}`}>
                <Button size="lg" variant="outline" className="border-white text-white hover:bg-white/10 text-lg px-8 w-full sm:w-auto">
                  <Phone className="h-5 w-5 mr-2" />
                  {content.contact.phone}
                </Button>
              </a>
            )}
          </div>
        </div>
      </section>

            {/* Footer */}
            <footer className="bg-gray-900 text-white py-12">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="grid md:grid-cols-4 gap-8">
                  <div className="md:col-span-2">
                    <div className="flex items-center gap-3 mb-4">
                      <img src="/emunah-logo.png" alt="Emunah Academy" className="h-10 w-10 rounded-lg object-cover" />
                      <div>
                        <span className="font-bold text-xl">Emunah</span>
                        <span className="font-light text-xl"> Academy</span>
                      </div>
                    </div>
                    <p className="text-gray-400 mb-4">
                      {t.landing.footer.empowering}
                    </p>
                  </div>
                  <div>
                    <h4 className="font-semibold mb-4 text-teal-400">{t.landing.footer.quickLinks}</h4>
                    <ul className="space-y-2 text-gray-400">
                      <li><button onClick={() => scrollToSection('about')} className="hover:text-white transition-colors">{t.landing.footer.aboutUs}</button></li>
                      <li><button onClick={() => scrollToSection('programs')} className="hover:text-white transition-colors">{t.landing.nav.programs}</button></li>
                      <li><button onClick={() => scrollToSection('faq')} className="hover:text-white transition-colors">{t.landing.nav.faq}</button></li>
                      <li><button onClick={() => scrollToSection('apply')} className="hover:text-white transition-colors">{t.landing.footer.applyNow}</button></li>
                      <li><Link to="/login" className="hover:text-white transition-colors">{t.landing.nav.signIn}</Link></li>
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-semibold mb-4 text-teal-400">{content.contact.title}</h4>
                    <ul className="space-y-3 text-gray-400">
                      {content.contact.phone && (
                        <li className="flex items-center gap-2">
                          <Phone className="h-4 w-4                           text-teal-400" />
                                                    <a href={`tel:${content.contact.phone}`} className="hover:text-white transition-colors">{content.contact.phone}</a>
                        </li>
                      )}
                      {content.contact.email && (
                        <li className="flex items-center gap-2">
                          <Mail className="h-4 w-4                           text-teal-400" />
                                                    <a href={`mailto:${content.contact.email}`} className="hover:text-white transition-colors">{content.contact.email}</a>
                        </li>
                      )}
                      {content.contact.address && (
                        <li className="flex items-start gap-2">
                          <MapPin className="h-4 w-4 text-teal-400 mt-0.5" />
                          <span>{content.contact.address}</span>
                        </li>
                      )}
                    </ul>
                  </div>
                </div>
                <div className="border-t border-gray-800 mt-8 pt-8 text-center text-gray-400">
                  <p>&copy; {new Date().getFullYear()} Emunah Academy. {t.landing.footer.allRightsReserved}</p>
                </div>
              </div>
            </footer>
    </div>
  );
}

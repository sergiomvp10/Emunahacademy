import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Settings, Save, RotateCcw, Globe, Users, BookOpen, 
  HelpCircle, Mail, CheckCircle
} from 'lucide-react';

interface HeroContent {
  title: string;
  subtitle: string;
  cta_primary: string;
  cta_secondary: string;
}

interface AboutContent {
  title: string;
  description: string;
  mission: string;
  vision: string;
}

interface HowItWorksContent {
  title: string;
  steps: Array<{ number: string; title: string; description: string }>;
}

interface ProgramsContent {
  title: string;
  subtitle: string;
  grades: Array<{ level: string; name: string; description: string }>;
}

interface ImpactContent {
  title: string;
  stats: Array<{ number: string; label: string }>;
}

interface FaqContent {
  title: string;
  questions: Array<{ question: string; answer: string }>;
}

interface ContactContent {
  title: string;
  email: string;
  phone: string;
  address: string;
}

export function SiteSettings() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedSection, setSavedSection] = useState<string | null>(null);
  
  const [hero, setHero] = useState<HeroContent>({
    title: '',
    subtitle: '',
    cta_primary: '',
    cta_secondary: ''
  });
  
  const [about, setAbout] = useState<AboutContent>({
    title: '',
    description: '',
    mission: '',
    vision: ''
  });
  
  const [howItWorks, setHowItWorks] = useState<HowItWorksContent>({
    title: '',
    steps: []
  });
  
  const [programs, setPrograms] = useState<ProgramsContent>({
    title: '',
    subtitle: '',
    grades: []
  });
  
  const [impact, setImpact] = useState<ImpactContent>({
    title: '',
    stats: []
  });
  
  const [faq, setFaq] = useState<FaqContent>({
    title: '',
    questions: []
  });
  
  const [contact, setContact] = useState<ContactContent>({
    title: '',
    email: '',
    phone: '',
    address: ''
  });

  useEffect(() => {
    loadContent();
  }, []);

  const loadContent = async () => {
    try {
      const data = await api.getSiteContent();
      setHero(data.hero as HeroContent);
      setAbout(data.about as AboutContent);
      setHowItWorks(data.how_it_works as HowItWorksContent);
      setPrograms(data.programs as ProgramsContent);
      setImpact(data.impact as ImpactContent);
      setFaq(data.faq as FaqContent);
      setContact(data.contact as ContactContent);
    } catch (error) {
      console.error('Error loading site content:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveSection = async (section: string, content: unknown) => {
    setSaving(true);
    try {
      await api.updateSiteContent(section, content as Record<string, unknown>);
      setSavedSection(section);
      setTimeout(() => setSavedSection(null), 2000);
    } catch (error) {
      console.error('Error saving section:', error);
      alert('Error saving. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (user?.role !== 'superuser') {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="p-12 text-center">
            <p className="text-gray-500">You don't have permission to access this page.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-500"></div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <Settings className="h-6 w-6" />
            Site Settings
          </h1>
          <p className="text-gray-500 mt-1">Manage your landing page content</p>
        </div>
        <a 
          href="/" 
          target="_blank" 
          rel="noopener noreferrer"
          className="text-teal-600 hover:text-teal-700 flex items-center gap-1"
        >
          <Globe className="h-4 w-4" />
          View Landing Page
        </a>
      </div>

      <Tabs defaultValue="hero" className="space-y-6">
        <TabsList className="grid grid-cols-7 w-full">
          <TabsTrigger value="hero">Hero</TabsTrigger>
          <TabsTrigger value="about">About</TabsTrigger>
          <TabsTrigger value="how">How It Works</TabsTrigger>
          <TabsTrigger value="programs">Programs</TabsTrigger>
          <TabsTrigger value="impact">Impact</TabsTrigger>
          <TabsTrigger value="faq">FAQ</TabsTrigger>
          <TabsTrigger value="contact">Contact</TabsTrigger>
        </TabsList>

        {/* Hero Section */}
        <TabsContent value="hero">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe className="h-5 w-5" />
                Hero Section
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="hero-title">Title</Label>
                <Input
                  id="hero-title"
                  value={hero.title}
                  onChange={(e) => setHero({ ...hero, title: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="hero-subtitle">Subtitle</Label>
                <Textarea
                  id="hero-subtitle"
                  value={hero.subtitle}
                  onChange={(e) => setHero({ ...hero, subtitle: e.target.value })}
                  rows={3}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="hero-cta1">Primary Button Text</Label>
                  <Input
                    id="hero-cta1"
                    value={hero.cta_primary}
                    onChange={(e) => setHero({ ...hero, cta_primary: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="hero-cta2">Secondary Button Text</Label>
                  <Input
                    id="hero-cta2"
                    value={hero.cta_secondary}
                    onChange={(e) => setHero({ ...hero, cta_secondary: e.target.value })}
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={loadContent} disabled={saving}>
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Reset
                </Button>
                <Button onClick={() => saveSection('hero', hero)} disabled={saving}>
                  {savedSection === 'hero' ? (
                    <><CheckCircle className="h-4 w-4 mr-2" /> Saved</>
                  ) : (
                    <><Save className="h-4 w-4 mr-2" /> Save Changes</>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* About Section */}
        <TabsContent value="about">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                About Section
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="about-title">Section Title</Label>
                <Input
                  id="about-title"
                  value={about.title}
                  onChange={(e) => setAbout({ ...about, title: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="about-desc">Description</Label>
                <Textarea
                  id="about-desc"
                  value={about.description}
                  onChange={(e) => setAbout({ ...about, description: e.target.value })}
                  rows={4}
                />
              </div>
              <div>
                <Label htmlFor="about-mission">Mission Statement</Label>
                <Textarea
                  id="about-mission"
                  value={about.mission}
                  onChange={(e) => setAbout({ ...about, mission: e.target.value })}
                  rows={2}
                />
              </div>
              <div>
                <Label htmlFor="about-vision">Vision Statement</Label>
                <Textarea
                  id="about-vision"
                  value={about.vision}
                  onChange={(e) => setAbout({ ...about, vision: e.target.value })}
                  rows={2}
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={loadContent} disabled={saving}>
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Reset
                </Button>
                <Button onClick={() => saveSection('about', about)} disabled={saving}>
                  {savedSection === 'about' ? (
                    <><CheckCircle className="h-4 w-4 mr-2" /> Saved</>
                  ) : (
                    <><Save className="h-4 w-4 mr-2" /> Save Changes</>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* How It Works Section */}
        <TabsContent value="how">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BookOpen className="h-5 w-5" />
                How It Works Section
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="how-title">Section Title</Label>
                <Input
                  id="how-title"
                  value={howItWorks.title}
                  onChange={(e) => setHowItWorks({ ...howItWorks, title: e.target.value })}
                />
              </div>
              <div className="space-y-4">
                <Label>Steps</Label>
                {howItWorks.steps.map((step, index) => (
                  <div key={index} className="border rounded-lg p-4 space-y-3">
                    <div className="flex items-center gap-2">
                      <span className="bg-teal-500 text-white w-8 h-8 rounded-full flex items-center justify-center font-bold">
                        {step.number}
                      </span>
                      <Input
                        value={step.title}
                        onChange={(e) => {
                          const newSteps = [...howItWorks.steps];
                          newSteps[index].title = e.target.value;
                          setHowItWorks({ ...howItWorks, steps: newSteps });
                        }}
                        placeholder="Step title"
                      />
                    </div>
                    <Textarea
                      value={step.description}
                      onChange={(e) => {
                        const newSteps = [...howItWorks.steps];
                        newSteps[index].description = e.target.value;
                        setHowItWorks({ ...howItWorks, steps: newSteps });
                      }}
                      placeholder="Step description"
                      rows={2}
                    />
                  </div>
                ))}
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={loadContent} disabled={saving}>
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Reset
                </Button>
                <Button onClick={() => saveSection('how_it_works', howItWorks)} disabled={saving}>
                  {savedSection === 'how_it_works' ? (
                    <><CheckCircle className="h-4 w-4 mr-2" /> Saved</>
                  ) : (
                    <><Save className="h-4 w-4 mr-2" /> Save Changes</>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Programs Section */}
        <TabsContent value="programs">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BookOpen className="h-5 w-5" />
                Programs Section
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="programs-title">Section Title</Label>
                <Input
                  id="programs-title"
                  value={programs.title}
                  onChange={(e) => setPrograms({ ...programs, title: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="programs-subtitle">Subtitle</Label>
                <Input
                  id="programs-subtitle"
                  value={programs.subtitle}
                  onChange={(e) => setPrograms({ ...programs, subtitle: e.target.value })}
                />
              </div>
              <div className="space-y-4">
                <Label>Grade Programs</Label>
                {programs.grades.map((grade, index) => (
                  <div key={index} className="border rounded-lg p-4 space-y-3">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Level</Label>
                        <Input
                          value={grade.level}
                          onChange={(e) => {
                            const newGrades = [...programs.grades];
                            newGrades[index].level = e.target.value;
                            setPrograms({ ...programs, grades: newGrades });
                          }}
                        />
                      </div>
                      <div>
                        <Label>Name</Label>
                        <Input
                          value={grade.name}
                          onChange={(e) => {
                            const newGrades = [...programs.grades];
                            newGrades[index].name = e.target.value;
                            setPrograms({ ...programs, grades: newGrades });
                          }}
                        />
                      </div>
                    </div>
                    <div>
                      <Label>Description</Label>
                      <Textarea
                        value={grade.description}
                        onChange={(e) => {
                          const newGrades = [...programs.grades];
                          newGrades[index].description = e.target.value;
                          setPrograms({ ...programs, grades: newGrades });
                        }}
                        rows={2}
                      />
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={loadContent} disabled={saving}>
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Reset
                </Button>
                <Button onClick={() => saveSection('programs', programs)} disabled={saving}>
                  {savedSection === 'programs' ? (
                    <><CheckCircle className="h-4 w-4 mr-2" /> Saved</>
                  ) : (
                    <><Save className="h-4 w-4 mr-2" /> Save Changes</>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Impact Section */}
        <TabsContent value="impact">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Impact Section
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="impact-title">Section Title</Label>
                <Input
                  id="impact-title"
                  value={impact.title}
                  onChange={(e) => setImpact({ ...impact, title: e.target.value })}
                />
              </div>
              <div className="space-y-4">
                <Label>Statistics</Label>
                <div className="grid grid-cols-2 gap-4">
                  {impact.stats.map((stat, index) => (
                    <div key={index} className="border rounded-lg p-4 space-y-2">
                      <div>
                        <Label>Number/Value</Label>
                        <Input
                          value={stat.number}
                          onChange={(e) => {
                            const newStats = [...impact.stats];
                            newStats[index].number = e.target.value;
                            setImpact({ ...impact, stats: newStats });
                          }}
                          placeholder="e.g., 500+"
                        />
                      </div>
                      <div>
                        <Label>Label</Label>
                        <Input
                          value={stat.label}
                          onChange={(e) => {
                            const newStats = [...impact.stats];
                            newStats[index].label = e.target.value;
                            setImpact({ ...impact, stats: newStats });
                          }}
                          placeholder="e.g., Students Enrolled"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={loadContent} disabled={saving}>
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Reset
                </Button>
                <Button onClick={() => saveSection('impact', impact)} disabled={saving}>
                  {savedSection === 'impact' ? (
                    <><CheckCircle className="h-4 w-4 mr-2" /> Saved</>
                  ) : (
                    <><Save className="h-4 w-4 mr-2" /> Save Changes</>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* FAQ Section */}
        <TabsContent value="faq">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <HelpCircle className="h-5 w-5" />
                FAQ Section
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="faq-title">Section Title</Label>
                <Input
                  id="faq-title"
                  value={faq.title}
                  onChange={(e) => setFaq({ ...faq, title: e.target.value })}
                />
              </div>
              <div className="space-y-4">
                <Label>Questions & Answers</Label>
                {faq.questions.map((item, index) => (
                  <div key={index} className="border rounded-lg p-4 space-y-3">
                    <div>
                      <Label>Question</Label>
                      <Input
                        value={item.question}
                        onChange={(e) => {
                          const newQuestions = [...faq.questions];
                          newQuestions[index].question = e.target.value;
                          setFaq({ ...faq, questions: newQuestions });
                        }}
                      />
                    </div>
                    <div>
                      <Label>Answer</Label>
                      <Textarea
                        value={item.answer}
                        onChange={(e) => {
                          const newQuestions = [...faq.questions];
                          newQuestions[index].answer = e.target.value;
                          setFaq({ ...faq, questions: newQuestions });
                        }}
                        rows={2}
                      />
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={loadContent} disabled={saving}>
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Reset
                </Button>
                <Button onClick={() => saveSection('faq', faq)} disabled={saving}>
                  {savedSection === 'faq' ? (
                    <><CheckCircle className="h-4 w-4 mr-2" /> Saved</>
                  ) : (
                    <><Save className="h-4 w-4 mr-2" /> Save Changes</>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Contact Section */}
        <TabsContent value="contact">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mail className="h-5 w-5" />
                Contact Section
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="contact-title">Section Title</Label>
                <Input
                  id="contact-title"
                  value={contact.title}
                  onChange={(e) => setContact({ ...contact, title: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="contact-email">Email Address</Label>
                <Input
                  id="contact-email"
                  type="email"
                  value={contact.email}
                  onChange={(e) => setContact({ ...contact, email: e.target.value })}
                  placeholder="info@emunahacademy.org"
                />
              </div>
              <div>
                <Label htmlFor="contact-phone">Phone Number</Label>
                <Input
                  id="contact-phone"
                  value={contact.phone}
                  onChange={(e) => setContact({ ...contact, phone: e.target.value })}
                  placeholder="+1 (555) 123-4567"
                />
              </div>
              <div>
                <Label htmlFor="contact-address">Address</Label>
                <Textarea
                  id="contact-address"
                  value={contact.address}
                  onChange={(e) => setContact({ ...contact, address: e.target.value })}
                  placeholder="123 Education Street, City, Country"
                  rows={2}
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={loadContent} disabled={saving}>
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Reset
                </Button>
                <Button onClick={() => saveSection('contact', contact)} disabled={saving}>
                  {savedSection === 'contact' ? (
                    <><CheckCircle className="h-4 w-4 mr-2" /> Saved</>
                  ) : (
                    <><Save className="h-4 w-4 mr-2" /> Save Changes</>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

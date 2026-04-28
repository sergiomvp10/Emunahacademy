import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Calculator,
  FlaskConical,
  Landmark,
  BookOpen,
  Globe,
  Send,
  Camera,
  Mic,
  Sparkles,
  Lightbulb,
  Brain,
  GraduationCap,
  ListChecks,
  Wand2,
  Plus,
  ChevronRight,
  MessageCircle,
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useLanguage } from '../context/LanguageContext';

type TutorId = 'maya' | 'sam' | 'hugo' | 'emma' | 'gabi';
type Mode = 'explain' | 'socratic';

interface Tutor {
  id: TutorId;
  name: string;
  subject: string;
  emoji: string;
  Icon: typeof Calculator;
  gradient: string;
  ring: string;
  bubble: string;
  taglineEs: string;
  taglineEn: string;
  greetingEs: string;
  greetingEn: string;
  socraticEs: string;
  socraticEn: string;
}

const TUTORS: Tutor[] = [
  {
    id: 'maya',
    name: 'Maya',
    subject: 'Math',
    emoji: '🧮',
    Icon: Calculator,
    gradient: 'from-indigo-500 via-violet-500 to-fuchsia-500',
    ring: 'ring-violet-300',
    bubble: 'bg-violet-50 text-violet-900 border-violet-100',
    taglineEs: 'Tu maestra de números, paciente y curiosa',
    taglineEn: 'Your patient, curious math mentor',
    greetingEs:
      '¡Hola! Soy Maya. Estás en Math — Grade 5, Lección 3 (fracciones equivalentes). ¿Querés que te lo explique paso a paso o probamos modo Sócrates y vamos resolviendo con pistas?',
    greetingEn:
      "Hi! I'm Maya. You're on Math — Grade 5, Lesson 3 (equivalent fractions). Want me to walk you through it or try Socratic mode with hints?",
    socraticEs:
      'Antes de darte la respuesta: ¿qué pasa si multiplicás el numerador y el denominador por el mismo número distinto de cero?',
    socraticEn:
      "Before I give you the answer: what happens if you multiply the numerator and the denominator by the same nonzero number?",
  },
  {
    id: 'sam',
    name: 'Sam',
    subject: 'Science',
    emoji: '🔬',
    Icon: FlaskConical,
    gradient: 'from-emerald-500 via-teal-500 to-cyan-500',
    ring: 'ring-emerald-300',
    bubble: 'bg-emerald-50 text-emerald-900 border-emerald-100',
    taglineEs: 'Experimentos, hipótesis y mucha curiosidad',
    taglineEn: 'Experiments, hypotheses, and plenty of curiosity',
    greetingEs:
      '¡Qué tal! Soy Sam. Estamos en Science — Grade 6, ciclo del agua. ¿Te explico el proceso de evaporación o querés que armemos un mini experimento mental?',
    greetingEn:
      "Hey! I'm Sam. We're on Science — Grade 6, the water cycle. Want me to explain evaporation or build a quick thought experiment?",
    socraticEs:
      '¿Qué creés que pasa con las moléculas de agua cuando reciben energía del sol?',
    socraticEn:
      'What do you think happens to water molecules when they receive energy from the sun?',
  },
  {
    id: 'hugo',
    name: 'Hugo',
    subject: 'History',
    emoji: '📜',
    Icon: Landmark,
    gradient: 'from-amber-500 via-orange-500 to-rose-500',
    ring: 'ring-amber-300',
    bubble: 'bg-amber-50 text-amber-900 border-amber-100',
    taglineEs: 'Cuentacuentos del pasado, pregunto causas y consecuencias',
    taglineEn: 'Storyteller of the past — I dig into causes and effects',
    greetingEs:
      '¡Saludos! Soy Hugo. Hoy: civilizaciones mesopotámicas. ¿Te interesa más cómo vivían, qué inventaron, o por qué cayeron?',
    greetingEn:
      "Greetings! I'm Hugo. Today: Mesopotamian civilizations. Want to focus on how they lived, what they invented, or why they fell?",
    socraticEs:
      '¿Qué características compartirían dos civilizaciones que se establecen cerca de grandes ríos?',
    socraticEn:
      'What traits might two civilizations share if they both settled near major rivers?',
  },
  {
    id: 'emma',
    name: 'Emma',
    subject: 'English Language Arts',
    emoji: '📚',
    Icon: BookOpen,
    gradient: 'from-pink-500 via-rose-500 to-red-500',
    ring: 'ring-rose-300',
    bubble: 'bg-rose-50 text-rose-900 border-rose-100',
    taglineEs: 'Lectura, escritura y el placer de las palabras',
    taglineEn: 'Reading, writing, and the joy of words',
    greetingEs:
      '¡Hola! Soy Emma. Acabás de leer "The Giver" cap. 4. ¿Querés que repasemos el tema central, los personajes, o practicamos un párrafo de respuesta?',
    greetingEn:
      "Hi! I'm Emma. You just read 'The Giver' ch. 4. Want to review the theme, characters, or practice a response paragraph?",
    socraticEs:
      'Cuando Jonas habla con The Giver, ¿qué emoción detectás en él que antes no aparecía?',
    socraticEn:
      "When Jonas talks to The Giver, what emotion do you sense in him that wasn't there before?",
  },
  {
    id: 'gabi',
    name: 'Gabi',
    subject: 'Geography',
    emoji: '🌍',
    Icon: Globe,
    gradient: 'from-sky-500 via-cyan-500 to-teal-500',
    ring: 'ring-cyan-300',
    bubble: 'bg-cyan-50 text-cyan-900 border-cyan-100',
    taglineEs: 'Mapas, climas y conexiones del mundo',
    taglineEn: 'Maps, climates, and how the world connects',
    greetingEs:
      '¡Hola! Soy Gabi. Hoy vemos los biomas de Sudamérica. ¿Empezamos por el Amazonas, los Andes o las Pampas?',
    greetingEn:
      "Hi! I'm Gabi. Today: the biomes of South America. Want to start with the Amazon, the Andes, or the Pampas?",
    socraticEs:
      '¿Por qué creés que el clima cambia tanto entre la costa y la cordillera de los Andes?',
    socraticEn:
      'Why do you think the climate changes so much between the coast and the Andes range?',
  },
];

interface Message {
  id: number;
  role: 'tutor' | 'student';
  text: string;
}

const QUICK_ACTIONS_ES = [
  { icon: ListChecks, label: 'Genera 5 preguntas de práctica' },
  { icon: Wand2, label: 'Resume la última lección' },
  { icon: Lightbulb, label: 'Dame una pista' },
  { icon: Brain, label: 'Explicame con un ejemplo' },
];

const QUICK_ACTIONS_EN = [
  { icon: ListChecks, label: 'Generate 5 practice questions' },
  { icon: Wand2, label: 'Summarize the last lesson' },
  { icon: Lightbulb, label: 'Give me a hint' },
  { icon: Brain, label: 'Explain with an example' },
];

export function TutorAI() {
  const { language } = useLanguage();
  const isEs = language === 'es';

  const [tutorId, setTutorId] = useState<TutorId>('maya');
  const [mode, setMode] = useState<Mode>('explain');
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [thinking, setThinking] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const tutor = useMemo(() => TUTORS.find((t) => t.id === tutorId)!, [tutorId]);

  useEffect(() => {
    setMessages([
      {
        id: Date.now(),
        role: 'tutor',
        text: isEs ? tutor.greetingEs : tutor.greetingEn,
      },
    ]);
  }, [tutorId, isEs, tutor.greetingEs, tutor.greetingEn]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, thinking]);

  const send = (text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;
    setInput('');
    const studentMsg: Message = { id: Date.now(), role: 'student', text: trimmed };
    setMessages((prev) => [...prev, studentMsg]);
    setThinking(true);

    setTimeout(() => {
      const reply: Message = {
        id: Date.now() + 1,
        role: 'tutor',
        text:
          mode === 'socratic'
            ? isEs
              ? tutor.socraticEs
              : tutor.socraticEn
            : isEs
            ? `Buena pregunta. ${
                tutor.subject === 'Math'
                  ? 'Pensemos paso a paso: primero identificá el dato que ya conocés, después qué te están pidiendo, y por último qué operación los conecta.'
                  : 'Vamos por partes: primero el contexto, después la idea principal, y al final un ejemplo concreto.'
              } (Esto es una respuesta de demostración — cuando enchufemos el modelo de IA real, las respuestas serán dinámicas.)`
            : `Great question. ${
                tutor.subject === 'Math'
                  ? "Let's think step by step: first identify what you already know, then what's being asked, and finally what operation connects them."
                  : "Let's go in order: context first, then the main idea, and finally a concrete example."
              } (This is a placeholder reply — once the real AI is connected, answers will be dynamic.)`,
      };
      setMessages((prev) => [...prev, reply]);
      setThinking(false);
    }, 900);
  };

  const quickActions = isEs ? QUICK_ACTIONS_ES : QUICK_ACTIONS_EN;

  return (
    <div className="h-[calc(100vh-9rem)] flex flex-col gap-3">
      <div className="flex items-center justify-between flex-wrap gap-2 flex-shrink-0">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <Sparkles className="h-6 w-6 text-indigo-500" />
            Tutor AI
            <span className="ml-2 text-xs uppercase tracking-wide bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full">
              Beta
            </span>
          </h1>
          <p className="text-gray-500 text-sm">
            {isEs
              ? 'Cinco tutores con personalidad, dos modos, y un asistente de práctica.'
              : 'Five tutors with personality, two modes, and a practice assistant.'}
          </p>
        </div>
        <Button variant="outline" size="sm" className="gap-1.5">
          <Plus className="h-4 w-4" />
          {isEs ? 'Nueva conversación' : 'New chat'}
        </Button>
      </div>

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-4 min-h-0">
        <Card className="lg:col-span-3 p-3 h-full flex flex-col overflow-hidden">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-400 px-2 mb-2 flex-shrink-0">
            {isEs ? 'Tus tutores' : 'Your tutors'}
          </h2>
          <ul className="space-y-1 flex-1 overflow-y-auto pr-1 -mr-1">
            {TUTORS.map((tt) => {
              const isActive = tt.id === tutorId;
              return (
                <li key={tt.id}>
                  <button
                    onClick={() => setTutorId(tt.id)}
                    className={`w-full flex items-center gap-3 px-2.5 py-2.5 rounded-xl transition border ${
                      isActive
                        ? 'border-indigo-200 bg-indigo-50/60'
                        : 'border-transparent hover:bg-gray-50'
                    }`}
                  >
                    <div
                      className={`relative h-10 w-10 rounded-full bg-gradient-to-br ${tt.gradient} flex items-center justify-center text-white font-semibold flex-shrink-0 shadow-sm`}
                    >
                      <span className="text-lg">{tt.emoji}</span>
                      {isActive && (
                        <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full bg-emerald-500 border-2 border-white" />
                      )}
                    </div>
                    <div className="min-w-0 text-left flex-1">
                      <p
                        className={`text-sm font-semibold truncate ${
                          isActive ? 'text-indigo-700' : 'text-gray-800'
                        }`}
                      >
                        {tt.name}
                      </p>
                      <p className="text-xs text-gray-500 truncate">{tt.subject}</p>
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>

          <div className="mt-3 px-2.5 py-3 rounded-xl bg-gradient-to-br from-indigo-600 to-violet-600 text-white flex-shrink-0">
            <p className="text-xs uppercase tracking-wider opacity-80">Practice Arena</p>
            <p className="text-sm font-semibold mt-1 leading-snug">
              {isEs
                ? 'Generá quizzes y flashcards desde cualquier lección.'
                : 'Generate quizzes & flashcards from any lesson.'}
            </p>
            <Button
              variant="secondary"
              size="sm"
              className="mt-2 w-full bg-white/20 hover:bg-white/30 text-white border-0"
            >
              <ListChecks className="h-4 w-4 mr-1.5" />
              {isEs ? 'Practicar' : 'Practice'}
            </Button>
          </div>
        </Card>

        <Card className="lg:col-span-6 flex flex-col overflow-hidden h-full min-h-0">
          <div
            className={`relative px-5 py-4 text-white bg-gradient-to-r ${tutor.gradient}`}
          >
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-full bg-white/20 backdrop-blur flex items-center justify-center text-2xl shadow">
                  {tutor.emoji}
                </div>
                <div>
                  <p className="font-semibold leading-tight">{tutor.name}</p>
                  <p className="text-xs opacity-90">
                    {tutor.subject} · {isEs ? tutor.taglineEs : tutor.taglineEn}
                  </p>
                </div>
              </div>
              <div className="inline-flex bg-white/20 rounded-full p-0.5 backdrop-blur">
                <button
                  onClick={() => setMode('explain')}
                  className={`px-3 py-1 text-xs rounded-full transition ${
                    mode === 'explain'
                      ? 'bg-white text-gray-800 shadow-sm'
                      : 'text-white/90 hover:text-white'
                  }`}
                >
                  <Sparkles className="h-3 w-3 inline mr-1" />
                  {isEs ? 'Explicar' : 'Explain'}
                </button>
                <button
                  onClick={() => setMode('socratic')}
                  className={`px-3 py-1 text-xs rounded-full transition ${
                    mode === 'socratic'
                      ? 'bg-white text-gray-800 shadow-sm'
                      : 'text-white/90 hover:text-white'
                  }`}
                >
                  <Brain className="h-3 w-3 inline mr-1" />
                  {isEs ? 'Sócrates' : 'Socratic'}
                </button>
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-5 py-5 space-y-4 bg-gray-50/50">
            {messages.map((m) => {
              if (m.role === 'tutor') {
                return (
                  <div key={m.id} className="flex items-start gap-3">
                    <div
                      className={`h-9 w-9 rounded-full bg-gradient-to-br ${tutor.gradient} flex items-center justify-center text-white text-base flex-shrink-0 shadow-sm`}
                    >
                      {tutor.emoji}
                    </div>
                    <div className={`max-w-[80%] rounded-2xl rounded-tl-sm px-4 py-2.5 border ${tutor.bubble}`}>
                      <p className="text-sm leading-relaxed whitespace-pre-line">{m.text}</p>
                    </div>
                  </div>
                );
              }
              return (
                <div key={m.id} className="flex items-start gap-3 justify-end">
                  <div className="max-w-[80%] rounded-2xl rounded-tr-sm px-4 py-2.5 bg-indigo-600 text-white shadow-sm">
                    <p className="text-sm leading-relaxed whitespace-pre-line">{m.text}</p>
                  </div>
                </div>
              );
            })}

            {thinking && (
              <div className="flex items-start gap-3">
                <div
                  className={`h-9 w-9 rounded-full bg-gradient-to-br ${tutor.gradient} flex items-center justify-center text-white text-base flex-shrink-0 shadow-sm`}
                >
                  {tutor.emoji}
                </div>
                <div className={`rounded-2xl rounded-tl-sm px-4 py-3 border ${tutor.bubble}`}>
                  <div className="flex items-center gap-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-current animate-bounce [animation-delay:-0.3s]" />
                    <span className="h-1.5 w-1.5 rounded-full bg-current animate-bounce [animation-delay:-0.15s]" />
                    <span className="h-1.5 w-1.5 rounded-full bg-current animate-bounce" />
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <div className="border-t bg-white px-4 py-3 space-y-3 flex-shrink-0">
            <div className="flex flex-wrap items-center gap-2">
              {quickActions.map((qa) => (
                <button
                  key={qa.label}
                  onClick={() => send(qa.label)}
                  className="flex-shrink-0 inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full border border-gray-200 text-gray-700 hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-700 transition"
                >
                  <qa.icon className="h-3.5 w-3.5" />
                  {qa.label}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <button
                title="Snap & Solve"
                className="h-10 w-10 flex items-center justify-center rounded-full text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 transition"
              >
                <Camera className="h-5 w-5" />
              </button>
              <button
                title={isEs ? 'Modo voz' : 'Voice mode'}
                className="h-10 w-10 flex items-center justify-center rounded-full text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 transition"
              >
                <Mic className="h-5 w-5" />
              </button>
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    send(input);
                  }
                }}
                placeholder={
                  isEs
                    ? `Preguntale a ${tutor.name}…`
                    : `Ask ${tutor.name} anything…`
                }
                className="flex-1 rounded-full"
              />
              <Button
                onClick={() => send(input)}
                disabled={!input.trim()}
                className="rounded-full bg-indigo-600 hover:bg-indigo-700 h-10 w-10 p-0 flex items-center justify-center"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </Card>

        <div className="lg:col-span-3 flex flex-col gap-3 h-full min-h-0">
          <Card className="p-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">
              {isEs ? 'Estás estudiando' : 'You are studying'}
            </p>
            <div className="mt-2 flex items-start gap-3">
              <div
                className={`h-9 w-9 rounded-lg bg-gradient-to-br ${tutor.gradient} flex items-center justify-center text-white shadow-sm`}
              >
                <tutor.Icon className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <p className="font-semibold text-gray-800 text-sm leading-tight">
                  {tutor.subject} — Grade 5
                </p>
                <p className="text-xs text-gray-500 mt-0.5">
                  {isEs ? 'Lección 3 · 24% completado' : 'Lesson 3 · 24% complete'}
                </p>
                <button className="mt-2 inline-flex items-center text-xs text-indigo-600 hover:underline">
                  {isEs ? 'Ir al curso' : 'Open course'}
                  <ChevronRight className="h-3 w-3 ml-0.5" />
                </button>
              </div>
            </div>
          </Card>

          <Card className="p-4 flex-shrink-0">
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-3">
              {isEs ? 'Temas para reforzar' : 'Topics to review'}
            </p>
            <ul className="space-y-2">
              {[
                isEs ? 'Fracciones equivalentes' : 'Equivalent fractions',
                isEs ? 'Mínimo común múltiplo' : 'Least common multiple',
                isEs ? 'Decimales y porcentaje' : 'Decimals & percent',
              ].map((topic) => (
                <li
                  key={topic}
                  className="flex items-center justify-between gap-2 text-sm text-gray-700 px-2 py-1.5 rounded-lg bg-amber-50 border border-amber-100"
                >
                  <span className="truncate">{topic}</span>
                  <Lightbulb className="h-4 w-4 text-amber-500 flex-shrink-0" />
                </li>
              ))}
            </ul>
          </Card>

          <Card className="p-4 flex-1 flex flex-col min-h-0">
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-3 flex-shrink-0">
              {isEs ? 'Sugerencias' : 'Suggestions'}
            </p>
            <div className="space-y-2 flex-1 overflow-y-auto pr-1 -mr-1">
              {(isEs
                ? [
                    'Practicá 5 minutos de fracciones',
                    'Revisá la lección 2 antes del quiz',
                    'Pedile a Maya un ejemplo cotidiano',
                  ]
                : [
                    'Practice fractions for 5 min',
                    'Revisit lesson 2 before the quiz',
                    'Ask Maya for a real-world example',
                  ]
              ).map((s) => (
                <button
                  key={s}
                  onClick={() => send(s)}
                  className="w-full text-left text-sm text-gray-700 px-3 py-2 rounded-lg hover:bg-indigo-50 hover:text-indigo-700 transition flex items-center gap-2"
                >
                  <MessageCircle className="h-3.5 w-3.5 text-indigo-400 flex-shrink-0" />
                  <span className="truncate">{s}</span>
                </button>
              ))}
            </div>
          </Card>

          <Card className="p-4 border-2 border-dashed border-indigo-200 bg-indigo-50/40 flex-shrink-0">
            <p className="text-xs font-semibold uppercase tracking-wider text-indigo-600 flex items-center gap-1">
              <GraduationCap className="h-3.5 w-3.5" />
              {isEs ? 'Próximo paso' : 'Next step'}
            </p>
            <p className="text-sm text-gray-700 mt-1.5 leading-snug">
              {isEs
                ? 'Conectar IA real (OpenAI / Claude / Groq) y memoria por estudiante. Te aviso cuando definamos.'
                : 'Wire a real LLM (OpenAI / Claude / Groq) and per-student memory. Coming next.'}
            </p>
          </Card>
        </div>
      </div>
    </div>
  );
}

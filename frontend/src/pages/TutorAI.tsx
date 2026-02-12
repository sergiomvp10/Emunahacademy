import { Bot, MessageCircle, Sparkles, Construction } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

export function TutorAI() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-800">Tutor AI</h1>
        <p className="text-gray-500">Tu asistente de aprendizaje personalizado</p>
      </div>

      {/* Under Construction Card */}
      <Card className="border-2 border-dashed border-teal-300 bg-teal-50/50">
        <CardContent className="flex flex-col items-center justify-center py-16">
          <div className="relative mb-6">
            <div className="bg-teal-100 p-6 rounded-full">
              <Bot className="h-16 w-16 text-teal-600" />
            </div>
            <div className="absolute -top-2 -right-2 bg-yellow-400 p-2 rounded-full">
              <Construction className="h-5 w-5 text-yellow-800" />
            </div>
          </div>
          
          <h2 className="text-2xl font-bold text-gray-800 mb-2">
            En Construccion
          </h2>
          <p className="text-gray-600 text-center max-w-md mb-8">
            Estamos trabajando en tu tutor de inteligencia artificial personalizado. 
            Pronto podras hacer preguntas, recibir ayuda con tus tareas y obtener 
            recomendaciones de estudio adaptadas a tu progreso.
          </p>

          {/* Feature Preview */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full max-w-2xl">
            <div className="bg-white p-4 rounded-lg border border-gray-200 text-center">
              <MessageCircle className="h-8 w-8 text-teal-500 mx-auto mb-2" />
              <h3 className="font-medium text-gray-800">Chat Interactivo</h3>
              <p className="text-sm text-gray-500">Pregunta lo que necesites</p>
            </div>
            <div className="bg-white p-4 rounded-lg border border-gray-200 text-center">
              <Sparkles className="h-8 w-8 text-teal-500 mx-auto mb-2" />
              <h3 className="font-medium text-gray-800">Personalizado</h3>
              <p className="text-sm text-gray-500">Adaptado a tu nivel</p>
            </div>
            <div className="bg-white p-4 rounded-lg border border-gray-200 text-center">
              <Bot className="h-8 w-8 text-teal-500 mx-auto mb-2" />
              <h3 className="font-medium text-gray-800">Disponible 24/7</h3>
              <p className="text-sm text-gray-500">Siempre listo para ayudar</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

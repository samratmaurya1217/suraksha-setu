import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, XCircle, Trophy, ArrowRight, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';

const quizData = {
  earthquake: {
    title: 'Earthquake Safety Quiz',
    questions: [
      {
        id: 1,
        question: 'What should you do during an earthquake if you are indoors?',
        options: [
          'Run outside immediately',
          'Drop, Cover, and Hold On',
          'Stand in a doorway',
          'Hide under a window'
        ],
        correct: 1,
        explanation: 'Drop, Cover, and Hold On is the recommended action. Drop to your hands and knees, take cover under a sturdy table, and hold on until the shaking stops.'
      },
      {
        id: 2,
        question: 'What items should you keep in an earthquake emergency kit?',
        options: [
          'Only water and food',
          'Water, food, flashlight, first-aid kit, and radio',
          'Just a flashlight',
          'Only important documents'
        ],
        correct: 1,
        explanation: 'A comprehensive emergency kit should include water, non-perishable food, flashlight, batteries, first-aid supplies, radio, and essential medications.'
      },
      {
        id: 3,
        question: 'How long should you wait after an earthquake before returning to your home?',
        options: [
          'Immediately after shaking stops',
          'After 1 hour',
          'After authorities declare it safe',
          'After 24 hours'
        ],
        correct: 2,
        explanation: 'Wait for authorities to declare the building safe before re-entering. There may be structural damage, gas leaks, or other hazards.'
      },
      {
        id: 4,
        question: 'What is the ideal location in a room during an earthquake?',
        options: [
          'Under a sturdy table or desk',
          'Against an external wall',
          'Near a window',
          'In the center of the room'
        ],
        correct: 0,
        explanation: 'Taking cover under a sturdy table or desk protects you from falling objects and debris.'
      }
    ]
  },
  cyclone: {
    title: 'Cyclone Awareness Quiz',
    questions: [
      {
        id: 1,
        question: 'What does a "Red Alert" for cyclone warning mean?',
        options: [
          'Cyclone is approaching in 24-48 hours',
          'Cyclone will hit within 12 hours',
          'Cyclone might form in 3 days',
          'Cyclone has passed'
        ],
        correct: 1,
        explanation: 'Red Alert means the cyclone is expected to hit within 12 hours. Immediate evacuation and safety measures should be taken.'
      },
      {
        id: 2,
        question: 'Which side of a cyclone typically has the strongest winds?',
        options: [
          'Left side (looking at direction of movement)',
          'Right side (looking at direction of movement)',
          'Front side',
          'Back side'
        ],
        correct: 1,
        explanation: 'The right side of a cyclone (relative to its direction of movement) typically has the strongest winds due to the combination of cyclone rotation and forward movement.'
      },
      {
        id: 3,
        question: 'What should you do if caught outside during a cyclone?',
        options: [
          'Lie flat in a ditch or low-lying area',
          'Stand under a tree',
          'Keep walking to find shelter',
          'Climb a tall structure'
        ],
        correct: 0,
        explanation: 'If caught outside, lie flat in a ditch or depression away from trees and power lines. Cover your head with your hands.'
      }
    ]
  },
  flood: {
    title: 'Flood Safety Quiz',
    questions: [
      {
        id: 1,
        question: 'How much flowing water can sweep away a car?',
        options: [
          '6 inches (15 cm)',
          '1 foot (30 cm)',
          '2 feet (60 cm)',
          '3 feet (90 cm)'
        ],
        correct: 2,
        explanation: 'Just 2 feet (60 cm) of flowing water can sweep away most vehicles, including SUVs and trucks. Never drive through flooded areas.'
      },
      {
        id: 2,
        question: 'What is the first thing you should do when a flood warning is issued?',
        options: [
          'Wait and see how bad it gets',
          'Move to higher ground immediately',
          'Start sandbagging your property',
          'Park your car in the garage'
        ],
        correct: 1,
        explanation: 'Move to higher ground immediately when a flood warning is issued. Time is critical, and conditions can worsen rapidly.'
      },
      {
        id: 3,
        question: 'Is it safe to walk through floodwater?',
        options: [
          'Yes, if it\'s below your knees',
          'No, never walk through floodwater',
          'Yes, if you can see the ground',
          'Yes, if you have waterproof boots'
        ],
        correct: 1,
        explanation: 'Never walk through floodwater. Just 6 inches can knock you off your feet, and the water may hide dangerous debris, open manholes, or downed power lines.'
      }
    ]
  }
};

const InteractiveQuiz = ({ quizId = 'earthquake', onComplete }) => {
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [answers, setAnswers] = useState({});
  const [showResult, setShowResult] = useState(false);
  const [quizResult, setQuizResult] = useState(null);
  const [showExplanation, setShowExplanation] = useState(false);

  const quiz = quizData[quizId];
  const question = quiz.questions[currentQuestion];
  const progress = ((currentQuestion + 1) / quiz.questions.length) * 100;

  const handleAnswerSelect = (answerIndex) => {
    setSelectedAnswer(answerIndex);
    setShowExplanation(false);
  };

  const handleNext = () => {
    if (selectedAnswer === null) {
      toast.error('Please select an answer');
      return;
    }

    // Save answer
    const newAnswers = {
      ...answers,
      [question.id]: selectedAnswer
    };
    setAnswers(newAnswers);

    // Show explanation briefly
    setShowExplanation(true);

    // Move to next question after showing explanation
    setTimeout(() => {
      if (currentQuestion < quiz.questions.length - 1) {
        setCurrentQuestion(currentQuestion + 1);
        setSelectedAnswer(null);
        setShowExplanation(false);
      } else {
        // Quiz complete - calculate score
        submitQuiz(newAnswers);
      }
    }, 3000);
  };

  const submitQuiz = async (finalAnswers) => {
    try {
      const response = await fetch('http://localhost:8000/api/student/quiz/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          quiz_id: quizId,
          answers: finalAnswers
        })
      });

      const result = await response.json();
      setQuizResult(result);
      setShowResult(true);

      if (result.passed) {
        toast.success(`🎉 Quiz Passed! +${result.xp_earned} XP`);
      } else {
        toast.error('Quiz not passed. Try again!');
      }

      if (onComplete) {
        onComplete(result);
      }
    } catch (error) {
      toast.error('Error submitting quiz');
      console.error('Quiz submission error:', error);
    }
  };

  const handleRetry = () => {
    setCurrentQuestion(0);
    setSelectedAnswer(null);
    setAnswers({});
    setShowResult(false);
    setQuizResult(null);
    setShowExplanation(false);
  };

  if (showResult && quizResult) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="space-y-6"
      >
        <Card className={`border-2 ${quizResult.passed ? 'border-green-500 bg-green-50 dark:bg-green-950' : 'border-red-500 bg-red-50 dark:bg-red-950'}`}>
          <CardHeader>
            <div className="flex items-center justify-center mb-4">
              {quizResult.passed ? (
                <Trophy className="w-16 h-16 text-yellow-500 animate-bounce" />
              ) : (
                <XCircle className="w-16 h-16 text-red-500" />
              )}
            </div>
            <CardTitle className="text-center text-2xl">
              {quizResult.passed ? '🎉 Congratulations!' : '📚 Keep Learning!'}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <div className="space-y-2">
              <p className="text-4xl font-bold">{quizResult.score}%</p>
              <p className="text-muted-foreground">
                {quizResult.correct_answers} out of {quizResult.total_questions} correct
              </p>
            </div>

            {quizResult.passed && (
              <div className="p-4 bg-yellow-100 dark:bg-yellow-900/20 rounded-lg">
                <p className="font-bold text-yellow-700 dark:text-yellow-500">
                  +{quizResult.xp_earned} XP Earned! 🌟
                </p>
              </div>
            )}

            <div className="flex gap-3 justify-center pt-4">
              <Button onClick={handleRetry} variant="outline" className="gap-2">
                <RotateCcw className="w-4 h-4" />
                Try Again
              </Button>
              {quizResult.passed && (
                <Button onClick={() => window.location.href = '/student-portal'} className="gap-2">
                  <Trophy className="w-4 h-4" />
                  Continue Learning
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </motion.div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Progress Bar */}
      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span className="font-medium">Question {currentQuestion + 1} of {quiz.questions.length}</span>
          <span className="text-muted-foreground">{Math.round(progress)}%</span>
        </div>
        <Progress value={progress} className="h-2" />
      </div>

      {/* Question Card */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentQuestion}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.3 }}
        >
          <Card>
            <CardHeader>
              <CardTitle className="text-xl">{question.question}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {question.options.map((option, index) => {
                const isSelected = selectedAnswer === index;
                const isCorrect = index === question.correct;
                const showAnswer = showExplanation;

                return (
                  <motion.button
                    key={index}
                    onClick={() => !showExplanation && handleAnswerSelect(index)}
                    disabled={showExplanation}
                    whileHover={!showExplanation ? { scale: 1.02 } : {}}
                    whileTap={!showExplanation ? { scale: 0.98 } : {}}
                    className={`w-full p-4 text-left rounded-lg border-2 transition-all ${
                      showAnswer && isCorrect
                        ? 'border-green-500 bg-green-50 dark:bg-green-950'
                        : showAnswer && isSelected && !isCorrect
                        ? 'border-red-500 bg-red-50 dark:bg-red-950'
                        : isSelected
                        ? 'border-primary bg-primary/10'
                        : 'border-gray-200 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{option}</span>
                      {showAnswer && isCorrect && <CheckCircle className="w-5 h-5 text-green-500" />}
                      {showAnswer && isSelected && !isCorrect && <XCircle className="w-5 h-5 text-red-500" />}
                    </div>
                  </motion.button>
                );
              })}

              {/* Explanation */}
              <AnimatePresence>
                {showExplanation && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="mt-4 p-4 bg-blue-50 dark:bg-blue-950 rounded-lg border border-blue-200 dark:border-blue-800"
                  >
                    <p className="text-sm font-medium text-blue-700 dark:text-blue-300">
                      💡 {question.explanation}
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Next Button */}
              {!showExplanation && (
                <Button
                  onClick={handleNext}
                  disabled={selectedAnswer === null}
                  className="w-full mt-4 gap-2"
                >
                  {currentQuestion < quiz.questions.length - 1 ? (
                    <>
                      Next Question <ArrowRight className="w-4 h-4" />
                    </>
                  ) : (
                    <>
                      Submit Quiz <Trophy className="w-4 h-4" />
                    </>
                  )}
                </Button>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </AnimatePresence>
    </div>
  );
};

export default InteractiveQuiz;

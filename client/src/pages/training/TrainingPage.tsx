import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useQuery } from "@tanstack/react-query";
import { useClients } from "@/hooks/useClients";
import { useToast } from "@/hooks/use-toast";
import { Quiz, QuizResult } from "@/lib/types";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { apiRequest } from "@/lib/api";

interface SendQuizModalProps {
  isOpen: boolean;
  onClose: () => void;
  quiz: Quiz | null;
}

function SendQuizModal({ isOpen, onClose, quiz }: SendQuizModalProps) {
  const [selectedClientIds, setSelectedClientIds] = useState<number[]>([]);
  const { clients } = useClients();
  const { toast } = useToast();

  const handleToggleClient = (clientId: number) => {
    if (selectedClientIds.includes(clientId)) {
      setSelectedClientIds(selectedClientIds.filter(id => id !== clientId));
    } else {
      setSelectedClientIds([...selectedClientIds, clientId]);
    }
  };

  const handleSendQuiz = () => {
    if (selectedClientIds.length === 0) {
      toast({
        title: "No clients selected",
        description: "Please select at least one client to send the quiz to.",
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Quiz Sent",
      description: `The quiz has been sent to ${selectedClientIds.length} client(s).`,
    });

    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="bg-dark-lighter text-gray-100 border-dark-light max-w-md">
        <DialogHeader>
          <DialogTitle>Send Quiz to Clients</DialogTitle>
          <DialogDescription className="text-gray-400">
            Select which clients should receive the {quiz?.title} quiz.
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-80 overflow-y-auto">
          <div className="space-y-2">
            {clients.map(client => (
              <div
                key={client.id}
                className={`p-3 rounded-md cursor-pointer flex items-center space-x-3 ${
                  selectedClientIds.includes(client.id) 
                    ? "bg-primary bg-opacity-10 border border-primary" 
                    : "bg-dark border border-dark-light hover:border-gray-500"
                }`}
                onClick={() => handleToggleClient(client.id)}
              >
                <div className={`w-5 h-5 rounded-md border-2 ${
                  selectedClientIds.includes(client.id) 
                    ? "border-primary flex items-center justify-center" 
                    : "border-gray-400"
                }`}>
                  {selectedClientIds.includes(client.id) && (
                    <i className="fas fa-check text-xs text-primary"></i>
                  )}
                </div>
                <span>{client.name}</span>
                <span className={`ml-auto text-xs px-2 py-1 rounded-full ${
                  client.status === 'online' 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-gray-100 text-gray-800'
                }`}>
                  {client.status}
                </span>
              </div>
            ))}
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={onClose}
            className="border-dark-light text-gray-300 hover:bg-dark-light"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSendQuiz}
            className="bg-primary text-white hover:bg-blue-600"
          >
            Send Quiz
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function TrainingPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedQuiz, setSelectedQuiz] = useState<Quiz | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { toast } = useToast();

  const { data: quizzes = [], isLoading: isLoadingQuizzes, error: quizzesError, refetch: refetchQuizzes } = useQuery<Quiz[]>({
    queryKey: ['/api/quizzes'],
  });
  
  const { data: results = [], isLoading: isLoadingResults, error: resultsError } = useQuery<QuizResult[]>({
    queryKey: ['/api/quiz-results'],
  });

  const filteredQuizzes = quizzes.filter(quiz => 
    quiz.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    quiz.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSendQuiz = (quiz: Quiz) => {
    setSelectedQuiz(quiz);
    setIsModalOpen(true);
  };

  const handleViewResults = (quizId: number) => {
    const quizResults = results.filter(result => result.quizId === quizId);
    
    if (quizResults.length === 0) {
      toast({
        title: "No Results",
        description: "There are no results available for this quiz yet.",
      });
      return;
    }

    toast({
      title: "View Results",
      description: `Loading results for ${quizResults.length} participants...`,
    });
    
    // In a real app, this would navigate to a detailed results page
  };

  const handleCreateQuiz = () => {
    toast({
      title: "Create Quiz",
      description: "Quiz creation functionality will be implemented in a future update.",
    });
  };

  if (isLoadingQuizzes || isLoadingResults) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (quizzesError || resultsError) {
    return (
      <div className="flex flex-col items-center justify-center h-full">
        <div className="text-red-500 mb-4">
          <i className="fas fa-exclamation-triangle text-4xl"></i>
        </div>
        <h2 className="text-xl font-semibold mb-2">Failed to load training data</h2>
        <p className="text-gray-400 mb-4">
          There was an error loading the training data.
        </p>
        <Button
          onClick={() => refetchQuizzes()}
          className="bg-primary text-white hover:bg-blue-600"
        >
          Try Again
        </Button>
      </div>
    );
  }

  return (
    <>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold">Security Awareness Training</h1>

        <div className="flex space-x-3">
          <Button
            className="bg-primary hover:bg-blue-600 text-white px-4 py-2 rounded-md flex items-center space-x-2"
            onClick={handleCreateQuiz}
          >
            <i className="fas fa-plus-circle"></i>
            <span>Create Quiz</span>
          </Button>
          <Button
            className="bg-dark-lighter hover:bg-dark-light text-gray-200 px-4 py-2 rounded-md flex items-center space-x-2"
            onClick={() => refetchQuizzes()}
          >
            <i className="fas fa-sync-alt"></i>
            <span>Refresh</span>
          </Button>
        </div>
      </div>

      <Card className="bg-dark-lighter border-dark-light mb-6">
        <CardHeader className="pb-2">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <CardTitle>Available Quizzes</CardTitle>
            <div className="w-full md:w-auto">
              <Input
                type="text"
                placeholder="Search quizzes..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="bg-dark border-dark-light pl-8 w-full md:w-64 relative"
              />
              <i className="fas fa-search absolute -mt-7 ml-3 text-gray-400"></i>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filteredQuizzes.length === 0 ? (
            <div className="text-center py-10 text-gray-400">
              <i className="fas fa-graduation-cap text-5xl mb-4"></i>
              <p>No quizzes found. Create your first security awareness quiz!</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredQuizzes.map(quiz => {
                const quizResults = results.filter(result => result.quizId === quiz.id);
                const averageScore = quizResults.length > 0 
                  ? Math.round(quizResults.reduce((sum, result) => sum + result.score, 0) / quizResults.length)
                  : null;
                
                return (
                  <Card key={quiz.id} className="bg-dark border-dark-light">
                    <CardContent className="pt-6">
                      <div className="flex items-start">
                        <div className="w-10 h-10 bg-purple-500/20 rounded-md flex items-center justify-center text-purple-500">
                          <i className="fas fa-graduation-cap"></i>
                        </div>
                        <div className="ml-4 flex-1">
                          <h3 className="font-medium text-gray-100">{quiz.title}</h3>
                          <p className="text-sm text-gray-400">
                            {(quiz.questions as any[]).length} questions • {quizResults.length} completions
                          </p>
                          
                          {averageScore !== null && (
                            <div className="mt-2 flex items-center">
                              <div className="w-16 h-2 bg-dark rounded overflow-hidden">
                                <div 
                                  className={`h-full ${
                                    averageScore > 70 ? 'bg-green-500' : 
                                    averageScore > 40 ? 'bg-amber-500' : 'bg-red-500'
                                  }`} 
                                  style={{ width: `${averageScore}%` }}
                                ></div>
                              </div>
                              <span className="ml-2 text-xs text-gray-300">{averageScore}% avg. score</span>
                            </div>
                          )}
                          
                          <div className="flex mt-4 space-x-2">
                            <Button
                              size="sm"
                              className="bg-primary text-white hover:bg-blue-600 flex-1"
                              onClick={() => handleSendQuiz(quiz)}
                            >
                              <i className="fas fa-paper-plane mr-2"></i>
                              Send to Clients
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="border-dark-light text-gray-300 hover:bg-dark"
                              onClick={() => handleViewResults(quiz.id)}
                            >
                              <i className="fas fa-chart-bar"></i>
                            </Button>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="bg-dark-lighter border-dark-light">
        <CardHeader>
          <CardTitle>Quiz Compliance</CardTitle>
          <CardDescription className="text-gray-400">
            Track security awareness training compliance across all clients
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            <div className="flex flex-col">
              <div className="flex justify-between items-center mb-2">
                <h3 className="text-sm font-medium">Overall Compliance</h3>
                <span className="text-sm font-medium text-green-500">86%</span>
              </div>
              <div className="w-full h-2 bg-dark rounded overflow-hidden">
                <div className="bg-green-500 h-full" style={{ width: "86%" }}></div>
              </div>
            </div>

            <div className="space-y-3">
              <h3 className="text-sm font-medium">Completion by Client</h3>
              
              {/* This would be dynamically generated based on actual data */}
              <div className="space-y-2">
                <div className="flex justify-between items-center mb-1">
                  <div className="flex items-center">
                    <span className="w-6 h-6 bg-blue-100 text-blue-800 rounded-md flex items-center justify-center text-xs font-semibold mr-2">
                      AC
                    </span>
                    <span className="text-sm">Acme Corporation</span>
                  </div>
                  <span className="text-xs font-medium text-green-500">100%</span>
                </div>
                <div className="w-full h-1.5 bg-dark rounded overflow-hidden">
                  <div className="bg-green-500 h-full" style={{ width: "100%" }}></div>
                </div>
              </div>
              
              <div className="space-y-2">
                <div className="flex justify-between items-center mb-1">
                  <div className="flex items-center">
                    <span className="w-6 h-6 bg-purple-100 text-purple-800 rounded-md flex items-center justify-center text-xs font-semibold mr-2">
                      GL
                    </span>
                    <span className="text-sm">Global Logistics</span>
                  </div>
                  <span className="text-xs font-medium text-green-500">92%</span>
                </div>
                <div className="w-full h-1.5 bg-dark rounded overflow-hidden">
                  <div className="bg-green-500 h-full" style={{ width: "92%" }}></div>
                </div>
              </div>
              
              <div className="space-y-2">
                <div className="flex justify-between items-center mb-1">
                  <div className="flex items-center">
                    <span className="w-6 h-6 bg-red-100 text-red-800 rounded-md flex items-center justify-center text-xs font-semibold mr-2">
                      TS
                    </span>
                    <span className="text-sm">TechSolutions Inc</span>
                  </div>
                  <span className="text-xs font-medium text-amber-500">67%</span>
                </div>
                <div className="w-full h-1.5 bg-dark rounded overflow-hidden">
                  <div className="bg-amber-500 h-full" style={{ width: "67%" }}></div>
                </div>
              </div>
              
              <div className="space-y-2">
                <div className="flex justify-between items-center mb-1">
                  <div className="flex items-center">
                    <span className="w-6 h-6 bg-green-100 text-green-800 rounded-md flex items-center justify-center text-xs font-semibold mr-2">
                      FH
                    </span>
                    <span className="text-sm">Farmhouse Organics</span>
                  </div>
                  <span className="text-xs font-medium text-amber-500">78%</span>
                </div>
                <div className="w-full h-1.5 bg-dark rounded overflow-hidden">
                  <div className="bg-amber-500 h-full" style={{ width: "78%" }}></div>
                </div>
              </div>
              
              <div className="space-y-2">
                <div className="flex justify-between items-center mb-1">
                  <div className="flex items-center">
                    <span className="w-6 h-6 bg-amber-100 text-amber-800 rounded-md flex items-center justify-center text-xs font-semibold mr-2">
                      BF
                    </span>
                    <span className="text-sm">BuildFast Construction</span>
                  </div>
                  <span className="text-xs font-medium text-red-500">33%</span>
                </div>
                <div className="w-full h-1.5 bg-dark rounded overflow-hidden">
                  <div className="bg-red-500 h-full" style={{ width: "33%" }}></div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <SendQuizModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        quiz={selectedQuiz} 
      />
    </>
  );
}

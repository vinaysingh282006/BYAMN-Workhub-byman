import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ref, get, update } from 'firebase/database';
import { database } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { 
  IndianRupee, 
  Users, 
  Clock,
  CheckCircle,
  XCircle,
  ArrowLeft,
  Upload,
  AlertTriangle,
  TrendingUp
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { 
  fetchUserData, 
  applyToCampaign, 
  submitWorkForCampaign 
} from '@/lib/data-cache';

interface Campaign {
  id: string;
  title: string;
  description: string;
  instructions: string;
  creatorId: string;
  creatorName: string;
  totalWorkers: number;
  completedWorkers: number;
  rewardPerWorker: number;
  totalBudget: number;
  remainingBudget: number;
  status: 'active' | 'paused' | 'completed' | 'banned';
  createdAt: number;
  category: string;
}

interface WorkSubmission {
  id: string;
  userId: string;
  userName: string;
  campaignId: string;
  proofUrl: string;
  status: 'pending' | 'approved' | 'rejected';
  submittedAt: number;
  reward: number;
}

const CampaignDetail = () => {
  const { id } = useParams<{ id: string }>();
  const { profile } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [loading, setLoading] = useState(true);
  const [isApplied, setIsApplied] = useState(false);
  const [workSubmission, setWorkSubmission] = useState({
    proofUrl: '',
  });
  const [showSubmissionForm, setShowSubmissionForm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const fetchCampaign = async () => {
      if (!id) return;
      
      try {
        const campaignSnap = await get(ref(database, `campaigns/${id}`));
        if (campaignSnap.exists()) {
          const data = campaignSnap.val();
          setCampaign({
            id,
            ...data,
          });
          
          // Check if user has already applied to this campaign
          if (profile?.uid) {
            const workSnap = await get(ref(database, `works/${profile.uid}/${id}`));
            if (workSnap.exists()) {
              setIsApplied(true);
            }
          }
        } else {
          toast({
            title: 'Campaign Not Found',
            description: 'The campaign you are looking for does not exist.',
            variant: 'destructive'
          });
          navigate('/campaigns');
        }
      } catch (error) {
        console.error('Error fetching campaign:', error);
        toast({
          title: 'Error',
          description: 'Failed to load campaign details.',
          variant: 'destructive'
        });
      } finally {
        setLoading(false);
      }
    };

    fetchCampaign();
  }, [id, profile?.uid, navigate, toast]);

  const handleApply = async () => {
    if (!profile || !campaign) return;

    try {
      // Check if campaign still has spots available
      if (campaign.completedWorkers >= campaign.totalWorkers) {
        toast({
          title: 'Campaign Full',
          description: 'This campaign has reached its maximum number of workers.',
          variant: 'destructive'
        });
        return;
      }

      // Check if user has already applied
      if (isApplied) {
        setShowSubmissionForm(true);
        return;
      }

      // Apply to campaign using data cache function
      const success = await applyToCampaign(
        campaign.id,
        profile.uid,
        profile.fullName,
        campaign.rewardPerWorker,
        profile.uid
      );

      if (success) {
        setIsApplied(true);
        setShowSubmissionForm(true);

        toast({
          title: 'Successfully Applied',
          description: 'You have successfully applied to this campaign. Please submit your work when ready.'
        });
      }
    } catch (error: any) {
      console.error('Error applying to campaign:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to apply to campaign. Please try again.',
        variant: 'destructive'
      });
    }
  };

  const handleSubmitWork = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile || !campaign || !workSubmission.proofUrl) return;

    setIsSubmitting(true);
    try {
      // Validate proof URL
      if (!workSubmission.proofUrl.startsWith('http')) {
        toast({
          title: 'Invalid URL',
          description: 'Please enter a valid URL for proof.',
          variant: 'destructive'
        });
        return;
      }

      // Submit work using data cache function
      const success = await submitWorkForCampaign(
        campaign.id,
        profile.uid,
        workSubmission.proofUrl,
        profile.uid
      );

      if (success) {
        toast({
          title: 'Work Submitted',
          description: 'Your work has been submitted for review. You will be notified once approved.'
        });

        setShowSubmissionForm(false);
        setWorkSubmission({ proofUrl: '' });
        
        // Refresh campaign data
        const updatedCampaignSnap = await get(ref(database, `campaigns/${id}`));
        if (updatedCampaignSnap.exists()) {
          const data = updatedCampaignSnap.val();
          setCampaign({
            id: id!,
            ...data,
          });
        }
      }
    } catch (error: any) {
      console.error('Error submitting work:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to submit work. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Navbar />
        <main className="flex-1 container mx-auto px-4 py-8">
          <div className="max-w-4xl mx-auto">
            <div className="animate-pulse">
              <div className="h-8 bg-muted rounded w-3/4 mb-6" />
              <div className="h-6 bg-muted rounded w-1/2 mb-4" />
              <div className="h-4 bg-muted rounded w-full mb-2" />
              <div className="h-4 bg-muted rounded w-2/3 mb-6" />
              <div className="h-32 bg-muted rounded mb-6" />
              <div className="h-40 bg-muted rounded" />
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (!campaign) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Navbar />
        <main className="flex-1 container mx-auto px-4 py-8">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="font-display text-2xl font-bold text-foreground mb-4">Campaign Not Found</h1>
            <p className="text-muted-foreground mb-6">The campaign you are looking for does not exist.</p>
            <Link to="/campaigns">
              <Button variant="outline">Browse All Campaigns</Button>
            </Link>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  const spotsLeft = campaign.totalWorkers - campaign.completedWorkers;
  const progressPercentage = (campaign.completedWorkers / campaign.totalWorkers) * 100;

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />
      
      <main className="flex-1 container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="mb-6">
            <Button variant="ghost" onClick={() => navigate(-1)} className="gap-2 mb-4">
              <ArrowLeft className="h-4 w-4" />
              Back to Campaigns
            </Button>
          </div>

          <Card className="mb-6">
            <CardHeader>
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <h1 className="font-display text-3xl font-bold text-foreground">{campaign.title}</h1>
                    <Badge variant="outline" className="bg-accent/10 text-accent border-accent/30">
                      {campaign.category || 'General'}
                    </Badge>
                  </div>
                  <p className="text-muted-foreground">
                    Created by {campaign.creatorName} on {new Date(campaign.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <Badge variant={campaign.status === 'active' ? 'default' : 'secondary'}>
                  {campaign.status.charAt(0).toUpperCase() + campaign.status.slice(1)}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-lg text-muted-foreground mb-6">{campaign.description}</p>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div className="flex items-center gap-2">
                  <IndianRupee className="h-5 w-5 text-success" />
                  <div>
                    <p className="text-sm text-muted-foreground">Reward per task</p>
                    <p className="font-semibold text-success">₹{campaign.rewardPerWorker}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-primary" />
                  <div>
                    <p className="text-sm text-muted-foreground">Total spots</p>
                    <p className="font-semibold">{campaign.totalWorkers}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-success" />
                  <div>
                    <p className="text-sm text-muted-foreground">Completed</p>
                    <p className="font-semibold">{campaign.completedWorkers}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-accent" />
                  <div>
                    <p className="text-sm text-muted-foreground">Spots left</p>
                    <p className="font-semibold">{spotsLeft}</p>
                  </div>
                </div>
              </div>

              {/* Progress bar */}
              <div className="mb-6">
                <div className="flex justify-between text-sm text-muted-foreground mb-1">
                  <span>Progress</span>
                  <span>{campaign.completedWorkers}/{campaign.totalWorkers}</span>
                </div>
                <div className="h-3 bg-muted rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-primary to-accent rounded-full transition-all duration-500"
                    style={{ width: `${progressPercentage}%` }}
                  />
                </div>
              </div>

              {campaign.status !== 'active' && (
                <div className="flex items-center gap-2 p-3 bg-destructive/10 rounded-lg border border-destructive/20 mb-6">
                  <AlertTriangle className="h-5 w-5 text-destructive" />
                  <p className="text-sm text-destructive">
                    This campaign is not active and cannot accept new applications.
                  </p>
                </div>
              )}

              {profile ? (
                <div className="space-y-4">
                  {!isApplied && campaign.status === 'active' && spotsLeft > 0 ? (
                    <Button 
                      className="w-full md:w-auto" 
                      onClick={handleApply}
                      disabled={spotsLeft === 0}
                    >
                      Apply to Campaign
                    </Button>
                  ) : isApplied ? (
                    <div className="space-y-4">
                      <div className="p-4 bg-success/10 rounded-lg border border-success/20">
                        <div className="flex items-center gap-2">
                          <CheckCircle className="h-5 w-5 text-success" />
                          <p className="font-medium text-success">You have applied to this campaign</p>
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">
                          Submit your work below to earn your reward
                        </p>
                      </div>
                      
                      {showSubmissionForm ? (
                        <Card>
                          <CardHeader>
                            <CardTitle>Submit Your Work</CardTitle>
                          </CardHeader>
                          <CardContent>
                            <form onSubmit={handleSubmitWork} className="space-y-4">
                              <div className="space-y-2">
                                <Label htmlFor="proofUrl">Proof URL</Label>
                                <div className="flex gap-2">
                                  <Input
                                    id="proofUrl"
                                    placeholder="https://example.com/proof-of-completion"
                                    value={workSubmission.proofUrl}
                                    onChange={(e) => setWorkSubmission({ proofUrl: e.target.value })}
                                    required
                                  />
                                  <Button type="button" variant="outline">
                                    <Upload className="h-4 w-4" />
                                  </Button>
                                </div>
                                <p className="text-xs text-muted-foreground">
                                  Provide a link to proof of completion (screenshot, receipt, etc.)
                                </p>
                              </div>
                              
                              <div className="flex gap-2">
                                <Button type="submit" disabled={isSubmitting}>
                                  {isSubmitting ? 'Submitting...' : 'Submit Work'}
                                </Button>
                                <Button 
                                  type="button" 
                                  variant="outline" 
                                  onClick={() => setShowSubmissionForm(false)}
                                >
                                  Cancel
                                </Button>
                              </div>
                            </form>
                          </CardContent>
                        </Card>
                      ) : (
                        <Button 
                          className="w-full md:w-auto" 
                          variant="outline"
                          onClick={() => setShowSubmissionForm(true)}
                        >
                          Submit Work
                        </Button>
                      )}
                    </div>
                  ) : (
                    <div className="p-4 bg-muted rounded-lg">
                      <p className="text-center text-muted-foreground">
                        This campaign is full or inactive
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="p-4 bg-muted rounded-lg">
                  <p className="text-center text-muted-foreground mb-4">
                    Sign in to apply to this campaign
                  </p>
                  <Link to="/auth">
                    <Button className="w-full">Sign In</Button>
                  </Link>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Instructions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="prose max-w-none">
                <p>{campaign.instructions}</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default CampaignDetail;
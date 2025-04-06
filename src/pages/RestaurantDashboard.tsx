// src/pages/RestaurantDashboard.tsx
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, CheckCircle, XCircle } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { getFirestore, collection, query, where, getDocs, doc, updateDoc, Timestamp, serverTimestamp } from "firebase/firestore"; // Added serverTimestamp
import { app } from "@/firebase";
import { useToast } from '@/components/ui/use-toast';
import { format } from 'date-fns';

const db = getFirestore(app);

interface FoodRequest {
    id: string;
    ngoId: string;
    foodType: string;
    quantity: number;
    description: string;
    status: 'pending' | 'accepted' | 'rejected';
    createdAt: Timestamp;
}

const RestaurantDashboard = () => {
    const { user, userRole, loading: authLoading } = useAuth();
    const { toast } = useToast();
    const navigate = useNavigate();
    const [foodRequests, setFoodRequests] = useState<FoodRequest[]>([]);
    const [loading, setLoading] = useState(true);
    const [updatingId, setUpdatingId] = useState<string | null>(null);

    useEffect(() => {
        const fetchRequests = async () => {
            if (userRole !== 'restaurant') return;
            setLoading(true);
            try {
                const q = query(collection(db, "food_requests"), where("status", "==", "pending"));
                const snapshot = await getDocs(q);
                const requests: FoodRequest[] = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as FoodRequest));
                setFoodRequests(requests);
            } catch (error: any) {
                toast({ title: "Error", description: "Failed to load food requests.", variant: "destructive" });
            } finally {
                setLoading(false);
            }
        };
        if (!authLoading) fetchRequests();
    }, [authLoading, userRole]);

    const handleVerification = async (requestId: string, status: 'accepted' | 'rejected') => {
        setUpdatingId(requestId);
        try {
            const requestRef = doc(db, "food_requests", requestId);
            await updateDoc(requestRef, { status, restaurantId: user!.uid, updatedAt: serverTimestamp() });
            setFoodRequests(prev => prev.filter(req => req.id !== requestId));
            toast({ title: `Request ${status}`, description: `Food request has been ${status}.` });
        } catch (error: any) {
            toast({ title: "Update Failed", description: error.message, variant: "destructive" });
        } finally {
            setUpdatingId(null);
        }
    };

    if (authLoading) {
        return <div className="min-h-screen flex items-center justify-center"><Loader2 className="h-12 w-12 animate-spin text-primary" /><span className="ml-4 text-muted-foreground">Loading...</span></div>;
    }
    if (userRole !== 'restaurant') {
        return (
            <div className="min-h-screen flex flex-col">
                <Navbar />
                <main className="flex-grow flex items-center justify-center text-center p-4">
                    <h1 className="text-2xl font-bold text-destructive mb-2">Access Denied</h1>
                    <p className="text-muted-foreground">Only restaurants can access this page.</p>
                    <Button onClick={() => navigate('/')} className="mt-4">Go Home</Button>
                </main>
                <Footer />
            </div>
        );
    }

    return (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="min-h-screen flex flex-col">
            <Navbar />
            <main className="flex-grow pt-24 pb-16">
                <section>
                    <div className="container mx-auto px-4">
                        <h1 className="text-3xl md:text-4xl font-bold mb-8">Restaurant Dashboard</h1>
                        {loading && <div className="flex justify-center p-16"><Loader2 className="h-10 w-10 animate-spin text-primary" /></div>}
                        {!loading && foodRequests.length === 0 && <p className="text-muted-foreground text-center py-8">No pending food requests.</p>}
                        {!loading && foodRequests.length > 0 && (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {foodRequests.map(req => (
                                    <Card key={req.id} className="flex flex-col bg-card border">
                                        <CardHeader>
                                            <CardTitle>{req.foodType}</CardTitle>
                                        </CardHeader>
                                        <CardContent className="flex-grow space-y-3 text-sm">
                                            <p><strong>Quantity:</strong> {req.quantity} {req.quantity > 1 ? "units" : "unit"}</p>
                                            <p><strong>Description:</strong> {req.description || 'N/A'}</p>
                                            <p className="text-xs text-muted-foreground">Requested: {format(req.createdAt.toDate(), "PPp")}</p>
                                        </CardContent>
                                        <CardFooter className="flex justify-end gap-2 border-t pt-4">
                                            <Button 
                                                variant="outline" 
                                                size="sm" 
                                                disabled={updatingId === req.id} 
                                                className="text-destructive border-destructive hover:bg-destructive/10 hover:text-destructive"
                                                onClick={() => handleVerification(req.id, 'rejected')}
                                            >
                                                {updatingId === req.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <XCircle className="h-4 w-4 mr-1" />}Reject
                                            </Button>
                                            <Button 
                                                variant="default" 
                                                size="sm" 
                                                disabled={updatingId === req.id} 
                                                className="bg-green-600 hover:bg-green-700 text-white"
                                                onClick={() => handleVerification(req.id, 'accepted')}
                                            >
                                                {updatingId === req.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4 mr-1" />}Accept
                                            </Button>
                                        </CardFooter>
                                    </Card>
                                ))}
                            </div>
                        )}
                    </div>
                </section>
            </main>
            <Footer />
        </motion.div>
    );
};

export default RestaurantDashboard;
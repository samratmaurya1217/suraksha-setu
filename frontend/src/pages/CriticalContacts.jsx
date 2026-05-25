import React, { useState } from 'react';
import { Phone, MapPin, AlertCircle, Hospital, Flame, Shield, Ambulance, Search, Copy, ExternalLink, CheckCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from 'sonner';

const CriticalContacts = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedNumber, setCopiedNumber] = useState('');

  const emergencyNumbers = {
    national: [
      {
        id: 'emergency_112',
        name: 'National Emergency Number',
        number: '112',
        icon: AlertCircle,
        color: 'text-red-600',
        bgColor: 'bg-red-100',
        description: 'Single emergency number for all services - Police, Fire, Medical',
        available: '24/7',
        features: ['GPS Location Tracking', 'Multi-language Support', 'Text & Voice']
      },
      {
        id: 'ndrf',
        name: 'National Disaster Response Force (NDRF)',
        number: '011-24363260',
        icon: Shield,
        color: 'text-orange-600',
        bgColor: 'bg-orange-100',
        description: 'Specialized force for disaster response and rescue operations',
        available: '24/7',
        features: ['Disaster Rescue', 'Relief Operations', 'Emergency Evacuation']
      },
      {
        id: 'ambulance',
        name: 'Emergency Ambulance Service',
        number: '102',
        icon: Ambulance,
        color: 'text-blue-600',
        bgColor: 'bg-blue-100',
        description: 'Free emergency ambulance service across India',
        available: '24/7',
        features: ['Free Service', 'GPS Tracking', 'Medical Assistance']
      },
      {
        id: 'police',
        name: 'Police Emergency',
        number: '100',
        icon: Shield,
        color: 'text-indigo-600',
        bgColor: 'bg-indigo-100',
        description: 'Police emergency control room',
        available: '24/7',
        features: ['Crime Reporting', 'Emergency Response', 'Public Safety']
      },
      {
        id: 'fire',
        name: 'Fire Department',
        number: '101',
        icon: Flame,
        color: 'text-red-600',
        bgColor: 'bg-red-100',
        description: 'Fire and rescue services',
        available: '24/7',
        features: ['Fire Fighting', 'Rescue Operations', 'Emergency Response']
      }
    ],
    disaster: [
      {
        id: 'ndma',
        name: 'National Disaster Management Authority',
        number: '1078',
        icon: AlertCircle,
        color: 'text-purple-600',
        bgColor: 'bg-purple-100',
        description: 'Main disaster management authority',
        available: '24/7'
      },
      {
        id: 'earthquake',
        name: 'Earthquake Helpline',
        number: '1092',
        icon: AlertCircle,
        color: 'text-brown-600',
        bgColor: 'bg-brown-100',
        description: 'Disaster Management Services for earthquakes',
        available: '24/7'
      },
      {
        id: 'cyclone',
        name: 'IMD Cyclone Warning',
        number: '1800-180-1551',
        icon: AlertCircle,
        color: 'text-blue-600',
        bgColor: 'bg-blue-100',
        description: 'India Meteorological Department - Cyclone warnings',
        available: '24/7'
      },
      {
        id: 'flood',
        name: 'Central Water Commission',
        number: '011-26714141',
        icon: AlertCircle,
        color: 'text-cyan-600',
        bgColor: 'bg-cyan-100',
        description: 'Flood forecasting and monitoring',
        available: 'Office Hours'
      }
    ],
    health: [
      {
        id: 'covid',
        name: 'COVID-19 Helpline',
        number: '1075',
        icon: Hospital,
        color: 'text-green-600',
        bgColor: 'bg-green-100',
        description: 'National COVID-19 helpline',
        available: '24/7'
      },
      {
        id: 'mental_health',
        name: 'Mental Health Helpline',
        number: '08046110007',
        icon: Hospital,
        color: 'text-purple-600',
        bgColor: 'bg-purple-100',
        description: 'NIMHANS mental health support',
        available: '24/7'
      },
      {
        id: 'poison',
        name: 'Poison Control Helpline',
        number: '011-26589391',
        icon: Hospital,
        color: 'text-red-600',
        bgColor: 'bg-red-100',
        description: 'National Poisons Information Centre (AIIMS Delhi)',
        available: '24/7'
      }
    ],
    utility: [
      {
        id: 'blood_bank',
        name: 'Blood Bank Helpline',
        number: '104',
        icon: Hospital,
        color: 'text-red-600',
        bgColor: 'bg-red-100',
        description: 'Central blood bank helpline',
        available: '24/7'
      },
      {
        id: 'women_helpline',
        name: 'Women Helpline',
        number: '181',
        icon: Shield,
        color: 'text-pink-600',
        bgColor: 'bg-pink-100',
        description: '24x7 emergency helpline for women in distress',
        available: '24/7'
      },
      {
        id: 'child_helpline',
        name: 'Child Helpline',
        number: '1098',
        icon: Shield,
        color: 'text-yellow-600',
        bgColor: 'bg-yellow-100',
        description: 'Emergency assistance and protection for children',
        available: '24/7'
      },
      {
        id: 'senior_citizen',
        name: 'Senior Citizen Helpline',
        number: '1800-180-1253',
        icon: Shield,
        color: 'text-gray-600',
        bgColor: 'bg-gray-100',
        description: 'Helpline for senior citizens',
        available: 'Office Hours'
      }
    ]
  };

  const copyToClipboard = (number, name) => {
    navigator.clipboard.writeText(number);
    setCopiedNumber(number);
    toast.success(`Copied ${name} number`);
    setTimeout(() => setCopiedNumber(''), 2000);
  };

  const callNumber = (number) => {
    window.location.href = `tel:${number}`;
  };

  const filterContacts = (contacts) => {
    if (!searchQuery.trim()) return contacts;
    const query = searchQuery.toLowerCase();
    return contacts.filter(contact => 
      contact.name.toLowerCase().includes(query) ||
      contact.description.toLowerCase().includes(query) ||
      contact.number.includes(query)
    );
  };

  const ContactCard = ({ contact }) => {
    const Icon = contact.icon;
    const isCopied = copiedNumber === contact.number;

    return (
      <Card className="hover:shadow-lg transition-all duration-200 border-l-4" style={{ borderLeftColor: contact.color.replace('text-', '#') }}>
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3 flex-1">
              <div className={`p-3 rounded-full ${contact.bgColor}`}>
                <Icon className={`w-6 h-6 ${contact.color}`} />
              </div>
              <div className="flex-1">
                <CardTitle className="text-lg">{contact.name}</CardTitle>
                <CardDescription className="text-sm mt-1">{contact.description}</CardDescription>
              </div>
            </div>
            <Badge variant="outline" className="text-xs">
              {contact.available}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg">
            <Phone className="w-5 h-5 text-primary" />
            <span className="text-2xl font-bold text-primary flex-1">{contact.number}</span>
          </div>
          
          <div className="flex gap-2">
            <Button 
              onClick={() => callNumber(contact.number)}
              className="flex-1 gap-2"
              size="lg"
            >
              <Phone className="w-4 h-4" />
              Call Now
            </Button>
            <Button 
              onClick={() => copyToClipboard(contact.number, contact.name)}
              variant="outline"
              size="lg"
              className="gap-2"
            >
              {isCopied ? <CheckCircle className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
              {isCopied ? 'Copied!' : 'Copy'}
            </Button>
          </div>

          {contact.features && (
            <div className="flex flex-wrap gap-2 mt-2">
              {contact.features.map((feature, idx) => (
                <Badge key={idx} variant="secondary" className="text-xs">
                  {feature}
                </Badge>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Critical Contacts</h1>
          <p className="text-muted-foreground mt-1">Quick access to critical services and helplines across India</p>
        </div>

        {/* Critical Alert */}
        <Alert className="border-red-200 bg-red-50 dark:bg-red-900/10">
          <AlertCircle className="h-5 w-5 text-red-600" />
          <AlertDescription className="text-red-800 dark:text-red-200 font-medium">
            In case of emergency, dial <span className="font-bold text-xl">112</span> for immediate assistance
            <div className="mt-2 flex gap-2">
              <Button 
                size="sm" 
                onClick={() => callNumber('112')}
                className="bg-red-600 hover:bg-red-700"
              >
                <Phone className="w-4 h-4 mr-2" />
                Call 112 Now
              </Button>
            </div>
          </AlertDescription>
        </Alert>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
          <Input
            placeholder="Search emergency services..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 h-12 text-base"
          />
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="national" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="national">National</TabsTrigger>
          <TabsTrigger value="disaster">Disaster</TabsTrigger>
          <TabsTrigger value="health">Health</TabsTrigger>
          <TabsTrigger value="utility">Utility</TabsTrigger>
        </TabsList>

        <TabsContent value="national" className="space-y-4 mt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filterContacts(emergencyNumbers.national).map(contact => (
              <ContactCard key={contact.id} contact={contact} />
            ))}
          </div>
        </TabsContent>

        <TabsContent value="disaster" className="space-y-4 mt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filterContacts(emergencyNumbers.disaster).map(contact => (
              <ContactCard key={contact.id} contact={contact} />
            ))}
          </div>
        </TabsContent>

        <TabsContent value="health" className="space-y-4 mt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filterContacts(emergencyNumbers.health).map(contact => (
              <ContactCard key={contact.id} contact={contact} />
            ))}
          </div>
        </TabsContent>

        <TabsContent value="utility" className="space-y-4 mt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filterContacts(emergencyNumbers.utility).map(contact => (
              <ContactCard key={contact.id} contact={contact} />
            ))}
          </div>
        </TabsContent>
      </Tabs>

      {/* Important Note */}
      <Card className="border-yellow-200 bg-yellow-50 dark:bg-yellow-900/10">
        <CardContent className="p-4">
          <p className="text-sm text-yellow-800 dark:text-yellow-200">
            <strong>Note:</strong> Always call <strong>112</strong> for life-threatening emergencies. Other numbers are for specific services and information.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default CriticalContacts;

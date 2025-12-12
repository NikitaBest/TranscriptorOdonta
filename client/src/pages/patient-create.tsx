import { useState } from 'react';
import { Link, useLocation } from 'wouter';
import { useQueryClient } from '@tanstack/react-query';
import { Layout } from '@/components/layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { patientsApi } from '@/lib/api/patients';
import { useToast } from '@/hooks/use-toast';
import type { ApiError } from '@/lib/api/types';
import { normalizePhone, handlePhoneInput } from '@/lib/utils/phone';

export default function PatientCreatePage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [comment, setComment] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!firstName || !lastName) {
      toast({
        title: "Ошибка",
        description: "Заполните имя и фамилию пациента",
        variant: "destructive",
      });
      return;
    }

    setIsCreating(true);

    try {
      const response = await patientsApi.create({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        phone: normalizePhone(phone),
        comment: comment.trim() || undefined,
      });

      // Инвалидируем запросы для обновления списка пациентов
      queryClient.invalidateQueries({ queryKey: ['patients'] });

      toast({
        title: "Пациент добавлен",
        description: `${response.firstName} ${response.lastName} добавлен в ваш список.`,
      });

      // Перенаправляем на страницу созданного пациента
      setLocation(`/patient/${response.id}`);
    } catch (err) {
      console.error('Create patient error:', err);
      
      const apiError = err as ApiError;
      const errorMessage =
        apiError.message ||
        apiError.errors?.firstName?.[0] ||
        apiError.errors?.lastName?.[0] ||
        apiError.errors?.phone?.[0] ||
        "Произошла ошибка при создании пациента. Попробуйте еще раз.";

      toast({
        title: "Ошибка создания пациента",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <Layout>
      <div className="max-w-2xl mx-auto flex flex-col gap-8">
        {/* Navigation & Header */}
        <div>
          <Link href="/dashboard">
            <Button variant="ghost" className="pl-0 hover:bg-transparent hover:text-primary mb-4 gap-2 text-muted-foreground">
              <ArrowLeft className="w-4 h-4" />
              Назад к списку
            </Button>
          </Link>
          <h1 className="text-2xl md:text-3xl font-display font-bold tracking-tight">
            Новый пациент
          </h1>
          <p className="text-sm md:text-base text-muted-foreground mt-1">
            Заполните данные для создания нового пациента
          </p>
        </div>

        {/* Form */}
        <Card className="rounded-3xl border-border/50 shadow-sm">
          <CardHeader className="p-4 sm:p-6">
            <CardTitle className="text-lg sm:text-xl md:text-2xl font-display">Данные пациента</CardTitle>
          </CardHeader>
          <CardContent className="p-4 sm:p-6">
            <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
              <div className="grid gap-3 sm:gap-4">
                <div className="grid gap-1.5 sm:gap-2">
                  <Label htmlFor="firstName" className="text-sm sm:text-base">Имя *</Label>
                  <Input 
                    id="firstName" 
                    value={firstName} 
                    onChange={e => setFirstName(e.target.value)} 
                    className="rounded-xl h-11 sm:h-12 text-sm sm:text-base"
                    required
                    disabled={isCreating}
                  />
                </div>

                <div className="grid gap-1.5 sm:gap-2">
                  <Label htmlFor="lastName" className="text-sm sm:text-base">Фамилия *</Label>
                  <Input 
                    id="lastName" 
                    value={lastName} 
                    onChange={e => setLastName(e.target.value)} 
                    className="rounded-xl h-11 sm:h-12 text-sm sm:text-base"
                    required
                    disabled={isCreating}
                  />
                </div>

                <div className="grid gap-1.5 sm:gap-2">
                  <Label htmlFor="phone" className="text-sm sm:text-base">Телефон</Label>
                  <Input 
                    id="phone" 
                    type="tel"
                    value={phone} 
                    onChange={e => setPhone(handlePhoneInput(e.target.value))} 
                    className="rounded-xl h-11 sm:h-12 text-sm sm:text-base"
                    placeholder="+7 (999) 123-45-67"
                    disabled={isCreating}
                  />
                </div>

                <div className="grid gap-1.5 sm:gap-2">
                  <Label htmlFor="comment" className="text-sm sm:text-base">Комментарий</Label>
                  <Input 
                    id="comment" 
                    value={comment} 
                    onChange={e => setComment(e.target.value)} 
                    className="rounded-xl h-11 sm:h-12 text-sm sm:text-base"
                    placeholder="Дополнительная информация о пациенте"
                    disabled={isCreating}
                  />
                </div>
              </div>

              <div className="flex flex-col gap-3 pt-4">
                <div className="flex gap-2 sm:gap-3">
                  <Link href="/dashboard" className="flex-1 min-w-0">
                    <Button 
                      type="button" 
                      variant="outline" 
                      className="w-full rounded-xl h-11 sm:h-12 text-sm sm:text-base px-3 sm:px-4"
                      disabled={isCreating}
                    >
                      Отмена
                    </Button>
                  </Link>
                  <Button 
                    type="submit" 
                    className="flex-1 min-w-0 rounded-xl h-11 sm:h-12 text-sm sm:text-base px-3 sm:px-4"
                    disabled={isCreating}
                  >
                    {isCreating ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1.5 sm:mr-2 animate-spin shrink-0" />
                        <span className="truncate">Создание...</span>
                      </>
                    ) : (
                      <>
                        <span className="hidden sm:inline truncate">Создать профиль</span>
                        <span className="sm:hidden truncate">Создать</span>
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}


import type { Question } from '@/types/game';

export const sistemDigitalQuestions: Question[] = [
  { id: 'sd_01', theme: 'sistem_digital', question: 'Apa itu logika digital?', options: ['Sebuah cabang matematika', 'Sistem yang menggunakan sinyal kontinu', 'Sistem yang menggunakan nilai biner', 'Metode pengukuran elektronik'], correctAnswer: 2, difficulty: 'easy' },
  { id: 'sd_02', theme: 'sistem_digital', question: 'Bilangan biner hanya menggunakan digit?', options: ['0 dan 1', '0,1,2', '0-9', 'A-F'], correctAnswer: 0, difficulty: 'easy' },
  { id: 'sd_03', theme: 'sistem_digital', question: 'Gerbang logika AND memberikan output 1 jika?', options: ['Salah satu input 1', 'Semua input 1', 'Semua input 0', 'Tidak ada input'], correctAnswer: 1, difficulty: 'easy' },
  { id: 'sd_04', theme: 'sistem_digital', question: 'Gerbang OR memberikan output 0 hanya jika?', options: ['Semua input 0', 'Salah satu input 1', 'Semua input 1', 'Tidak ada input'], correctAnswer: 0, difficulty: 'easy' },
  { id: 'sd_05', theme: 'sistem_digital', question: 'Apa fungsi flip-flop?', options: ['Menyimpan satu bit data', 'Mengalikan sinyal', 'Mengubah analog ke digital', 'Mengatur tegangan'], correctAnswer: 0, difficulty: 'medium' },
  { id: 'sd_06', theme: 'sistem_digital', question: 'Apa itu multiplexer?', options: ['Pemilih satu dari beberapa input', 'Pembagi sinyal menjadi banyak', 'Penambah aritmatika', 'Penyimpan data'], correctAnswer: 0, difficulty: 'medium' },
  { id: 'sd_07', theme: 'sistem_digital', question: 'Konversi biner ke desimal: 1010 (biner) = ?', options: ['10', '12', '8', '9'], correctAnswer: 0, difficulty: 'medium' },
  { id: 'sd_08', theme: 'sistem_digital', question: 'Apa output dari gerbang NOT jika inputnya 1?', options: ['1', '0', 'Tetap', 'Tidak dapat ditentukan'], correctAnswer: 1, difficulty: 'easy' },
  { id: 'sd_09', theme: 'sistem_digital', question: 'Apa fungsi dari demultiplexer?', options: ['Menggabungkan beberapa input', 'Memilih satu output untuk sebuah input', 'Memilih satu input dari beberapa output', 'Mentransfer data serial ke paralel'], correctAnswer: 1, difficulty: 'medium' },
  { id: 'sd_10', theme: 'sistem_digital', question: 'Sebuah full adder digunakan untuk?', options: ['Menjumlahkan dua bit tanpa carry', 'Menjumlahkan dua bit dan carry', 'Mengalikan bit', 'Membandingkan bit'], correctAnswer: 1, difficulty: 'hard' },
  { id: 'sd_11', theme: 'sistem_digital', question: 'Konversi desimal ke biner: 13 = ?', options: ['1101', '1011', '1110', '1001'], correctAnswer: 0, difficulty: 'medium' },
  { id: 'sd_12', theme: 'sistem_digital', question: 'Flip-flop JK berbeda karena?', options: ['Tidak memiliki clock', 'Memiliki input J dan K untuk kontrol', 'Hanya dapat menyimpan 0', 'Hanya dapat menyimpan 1'], correctAnswer: 1, difficulty: 'hard' },
  { id: 'sd_13', theme: 'sistem_digital', question: 'Apa itu register shift?', options: ['Register yang dapat memindahkan data selangkah', 'Register yang menyimpan satu bit', 'Register untuk A/D conversion', 'Register untuk I/O'], correctAnswer: 0, difficulty: 'medium' },
  { id: 'sd_14', theme: 'sistem_digital', question: 'Apa itu clock dalam sistem digital?', options: ['Sinyal yang menyinkronkan operasi', 'Sinyal untuk power', 'Jenis memori', 'Komponen input'], correctAnswer: 0, difficulty: 'easy' },
  { id: 'sd_15', theme: 'sistem_digital', question: 'Apa fungsi encoder?', options: ['Mengubah data paralel ke serial', 'Mengubah data analog ke digital', 'Mengubah input ke kode biner', 'Menyimpan data'], correctAnswer: 2, difficulty: 'medium' }];

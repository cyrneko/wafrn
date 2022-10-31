import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DashboardComponent } from './dashboard.component';
import { RouterModule, Routes } from '@angular/router';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { CardModule } from 'primeng/card';
import { DeferModule } from 'primeng/defer';
import { PostModule } from 'src/app/post/post.module';


const routes: Routes = [
  {
    path: '',
    component: DashboardComponent
  },
  {
    path: 'explore',
    component: DashboardComponent
  }
];

@NgModule({
  declarations: [
    DashboardComponent
  ],
  imports: [
    CommonModule,
    RouterModule.forChild(routes),
    ProgressSpinnerModule,
    CardModule,
    DeferModule,
    PostModule

  ]
})
export class DashboardModule { }
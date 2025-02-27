import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { InlineSVGModule } from 'ng-inline-svg-2';
import { RouterModule, Routes } from '@angular/router';
import { LayoutComponent } from './layout.component';
import { Routing } from '../../pages/routing';
import { HeaderComponent } from './components/header/header.component';
import { ContentComponent } from './components/content/content.component';
import { ScriptsInitComponent } from './components/scripts-init/scripts-init.component';
import { TopbarComponent } from './components/topbar/topbar.component';
import { DrawersModule } from '../partials';
const routes: Routes = [
  {
    path: '',
    component: LayoutComponent,
    children: Routing,
  },
];

@NgModule({
  declarations: [
    LayoutComponent,
    HeaderComponent,
    ContentComponent,
    ScriptsInitComponent,
    TopbarComponent
  ],
  imports: [
    CommonModule,
    RouterModule.forChild(routes),
    InlineSVGModule,
    DrawersModule,
  ],
  exports: [RouterModule],
})
export class LayoutModule { }
